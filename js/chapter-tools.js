import {state} from './state.js';
import {put} from './db.js';
import {$,esc,toast,modal,closeModal} from './utils.js';
import {drawBook,refresh} from './library.js';

export function renameChapters(){
 const book=state.book;
 if(!book?.chapters?.length)return toast('There are no chapters to rename');
 if(book.locked)return toast('Unlock this novel before renaming chapters');
 let selected=[...document.querySelectorAll('.chapter-rename-select:checked')].map(input=>Number(input.value)).filter(Number.isInteger).sort((a,b)=>a-b);
 if(!selected.length)return toast('Select one or more chapters using the checkboxes');
 const body='<div class="stack"><div class="row wrap"><button type="button" id="selectAllRenameChapters">Select all chapters</button><button type="button" id="clearRenameChapterSelection">Clear selection</button><span class="muted tiny" id="renameSelectionCount"></span></div><p class="muted tiny">Rename the selected chapters from top to bottom. Use <code>{n}</code> in the replacement for serial numbering. Regex capture groups such as <code>$1</code> are supported.</p><label>Find (regular expression)<input id="renamePattern" value="^.*$" spellcheck="false"></label><label>Replace with<input id="renameReplacement" value="Chapter - {n}" spellcheck="false"></label><label>Regex flags<input id="renameFlags" value="" placeholder="g, i, m, etc."></label><div class="row"><button type="button" id="previewChapterRename">Preview</button><span class="muted tiny" id="renameCount"></span></div><div id="renamePreview" class="rename-preview"></div><div class="row"><span class="grow"></span><button type="button" id="applyChapterRename" class="primary">Rename selected chapters</button></div></div>';
 modal('Rename chapters',body,()=>{
  const updateSelection=()=>{$('renameSelectionCount').textContent=selected.length+' selected';$('selectAllRenameChapters').textContent=selected.length===book.chapters.length?'All chapters selected':'Select all chapters'};
  $('selectAllRenameChapters').onclick=()=>{selected=book.chapters.map((_,index)=>index);updateSelection();preview()};
  $('clearRenameChapterSelection').onclick=()=>{selected=[];updateSelection();preview()};
  const preview=()=>{
   const pattern=$('renamePattern').value,replacement=$('renameReplacement').value,flags=$('renameFlags').value;
   let regex;try{regex=new RegExp(pattern,flags)}catch(error){$('renamePreview').innerHTML='<p class="muted tiny">Invalid regular expression: '+esc(error.message)+'</p>';$('renameCount').textContent='';return null}
   let number=1;const changes=selected.map(index=>{const chapter=book.chapters[index],old=String(chapter.title||'Chapter '+(index+1)),next=old.replace(regex,replacement.replaceAll('{n}',String(number++)));return{index,old,next}}).filter(item=>item.old!==item.next);
   $('renamePreview').innerHTML=changes.length?changes.map(item=>'<div class="rename-preview-row"><span>'+esc(item.old)+'</span><span aria-hidden="true">→</span><b>'+esc(item.next)+'</b></div>').join(''):'<p class="muted tiny">No selected chapter titles would change.</p>';
   $('renameCount').textContent=changes.length+' change'+(changes.length===1?'':'s');
   return changes;
  };
  $('previewChapterRename').onclick=preview;
  $('applyChapterRename').onclick=async()=>{
   const changes=preview();if(!changes?.length)return;
   if(!confirm('Rename '+changes.length+' chapter'+(changes.length===1?'':'s')+'?'))return;
   const now=Date.now();
   for(const item of changes){const chapter=book.chapters[item.index];chapter.history=Array.isArray(chapter.history)?chapter.history:[];chapter.history.push({title:chapter.title||'',text:chapter.text||'',editedAt:now,reason:'Renamed'});chapter.title=item.next;chapter.updatedAt=now}
   book.updated=now;await put(book);await refresh();drawBook();closeModal();toast(changes.length+' chapter'+(changes.length===1?'':'s')+' renamed');
  };
  updateSelection();preview();
 });
}
