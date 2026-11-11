import {state} from './state.js';
import {put} from './db.js';
import {$,esc,toast,modal,closeModal} from './utils.js';
import {openBook} from './library.js';
import {openReader} from './reader.js';

const books=()=>state.books||[];
const title=b=>b?.title||'Untitled novel';
const chapterTitle=(b,i)=>b?.chapters?.[i]?.title||'Chapter '+(i+1);
const save=async b=>{b.updated=Date.now();await put(b)};
async function syncCorrespondingChapters(a,b){
 const count=Math.min(a.chapters?.length||0,b.chapters?.length||0);
 // Remove only previously generated automatic pairs for this exact novel pair.
 for(const chapter of a.chapters||[])chapter.links=(chapter.links||[]).filter(x=>!(x.autoNovelPair&&x.targetBookId===b.id));
 for(const chapter of b.chapters||[])chapter.links=(chapter.links||[]).filter(x=>!(x.autoNovelPair&&x.targetBookId===a.id));
 for(let i=0;i<count;i++){
  a.chapters[i].links=a.chapters[i].links||[];b.chapters[i].links=b.chapters[i].links||[];
  a.chapters[i].links.push({targetBookId:b.id,targetChapterIndex:i,type:'counterpart',autoNovelPair:true});
  b.chapters[i].links.push({targetBookId:a.id,targetChapterIndex:i,type:'counterpart',autoNovelPair:true});
 }
 await save(a);await save(b);
 return count;
}
const relationLabel=r=>r==='counterpart'?'Alternate / corresponding edition':r==='sequel'?'Sequel':r==='prequel'?'Prequel':r==='next'?'Next chapter':'Previous chapter';
function novelOptions(selected){return books().map(b=>'<option value="'+esc(b.id)+'" '+(b.id===selected?'selected':'')+'>'+esc(title(b))+'</option>').join('')}
function chapterOptions(book,selected){return (book?.chapters||[]).map((c,i)=>'<option value="'+i+'" '+(i===Number(selected)?'selected':'')+'>'+esc(chapterTitle(book,i))+'</option>').join('')}

export function manageNovelLinks(book=state.book){
 if(!book)return;
 const links=Array.isArray(book.relationships)?book.relationships:[];
 const rows=links.map((l,i)=>{const target=books().find(b=>b.id===l.targetBookId);return '<div class="link-record"><span class="link-record-arrow">'+(l.type==='counterpart'?'↔':l.type==='sequel'?'→':'←')+'</span><span class="grow"><b>'+esc(title(target)||'Missing novel')+'</b><small>'+esc(relationLabel(l.type))+'</small></span><button data-remove-novel-link="'+i+'" aria-label="Remove relationship">×</button></div>'}).join('');
 const body='<div class="stack"><p class="muted tiny">Connect this novel to another edition or to a related book in a series. Corresponding editions are linked in both directions; sequel relationships keep their direction.</p><div class="link-record-list">'+(rows||'<p class="muted tiny">No novel relationships yet.</p>')+'</div><hr><label>Related novel<select id="novelLinkTarget">'+novelOptions('')+'</select></label><label>Relationship<select id="novelLinkType"><option value="counterpart">↔ Corresponding / same novel (two-way)</option><option value="sequel">→ This novel is a prequel; selected novel is its sequel</option></select></label><div class="row"><span class="grow"></span><button id="saveNovelLink" class="primary">Add relationship</button></div></div>';
 modal('Novel relationships · '+title(book),body,()=>{
  $('saveNovelLink').onclick=async()=>{const targetId=$('novelLinkTarget').value,type=$('novelLinkType').value;if(!targetId||targetId===book.id)return toast('Choose another novel');const target=books().find(b=>b.id===targetId);if(!target)return;book.relationships=book.relationships||[];target.relationships=target.relationships||[];book.relationships=book.relationships.filter(x=>x.targetBookId!==targetId);target.relationships=target.relationships.filter(x=>x.targetBookId!==book.id);book.relationships.push({targetBookId:targetId,type});target.relationships.push({targetBookId:book.id,type:type==='counterpart'?'counterpart':'prequel'});if(type==='counterpart'){const count=await syncCorrespondingChapters(book,target);toast('Novel linked; '+count+' matching chapter pair'+(count===1?'':'s')+' created')}else{await save(book);await save(target);toast('Novel relationship saved')}manageNovelLinks(book)};
  $('modalHost').onclick=async e=>{const btn=e.target.closest('[data-remove-novel-link]');if(!btn)return;const item=book.relationships?.[Number(btn.dataset.removeNovelLink)];if(!item)return;const target=books().find(b=>b.id===item.targetBookId);if(target&&item.type==='counterpart'){for(const c of book.chapters||[])c.links=(c.links||[]).filter(x=>!(x.autoNovelPair&&x.targetBookId===target.id));for(const c of target.chapters||[])c.links=(c.links||[]).filter(x=>!(x.autoNovelPair&&x.targetBookId===book.id));await save(target)}book.relationships=book.relationships.filter(x=>x.targetBookId!==item.targetBookId);if(target){target.relationships=(target.relationships||[]).filter(x=>x.targetBookId!==book.id);await save(target)}await save(book);manageNovelLinks(book)};
 });
}

export function manageChapterLinks(book=state.book,index=state.chapter){
 const chapter=book?.chapters?.[index];if(!chapter)return;
 const existing=Array.isArray(chapter.links)?chapter.links:[];
 const rows=existing.map((l,i)=>{const target=books().find(b=>b.id===l.targetBookId);return '<div class="link-record"><span class="link-record-arrow">'+(l.type==='counterpart'?'↔':l.type==='next'?'→':'←')+'</span><span class="grow"><b>'+esc(title(target))+'</b><small>'+esc(chapterTitle(target,Number(l.targetChapterIndex)))+' · '+esc(relationLabel(l.type))+'</small></span><button data-remove-chapter-link="'+i+'" aria-label="Remove chapter link">×</button></div>'}).join('');
 const body='<div class="stack"><p class="muted tiny">Link this chapter to its matching translation/source chapter, or to the next chapter in a serialized sequence. The linked chapter can be opened directly from the reader.</p><div class="link-record-list">'+(rows||'<p class="muted tiny">No chapter links yet.</p>')+'</div><label>Target novel<select id="chapterLinkBook">'+novelOptions('')+'</select></label><label>Target chapter<select id="chapterLinkTarget">'+chapterOptions(books()[0],-1)+'</select></label><label>Relationship<select id="chapterLinkType"><option value="counterpart">↔ Corresponding chapter (two-way)</option><option value="next">→ This chapter comes before the selected chapter</option></select></label><div class="row"><span class="grow"></span><button id="saveChapterLink" class="primary">Add chapter link</button></div></div>';
 modal('Chapter links · '+chapterTitle(book,index),body,()=>{
  const updateTargets=()=>{const target=books().find(b=>b.id===$('chapterLinkBook').value);$('chapterLinkTarget').innerHTML=chapterOptions(target,0)};
  $('chapterLinkBook').onchange=updateTargets;updateTargets();
  $('saveChapterLink').onclick=async()=>{const target=books().find(b=>b.id===$('chapterLinkBook').value),targetIndex=Number($('chapterLinkTarget').value),type=$('chapterLinkType').value;if(!target||target.id===book.id&&targetIndex===index||!Number.isInteger(targetIndex)||!target.chapters[targetIndex])return toast('Choose a different chapter');chapter.links=chapter.links||[];const targetChapter=target.chapters[targetIndex];targetChapter.links=targetChapter.links||[];chapter.links=chapter.links.filter(x=>!(x.targetBookId===target.id&&Number(x.targetChapterIndex)===targetIndex));targetChapter.links=targetChapter.links.filter(x=>!(x.targetBookId===book.id&&Number(x.targetChapterIndex)===index));chapter.links.push({targetBookId:target.id,targetChapterIndex:targetIndex,type});targetChapter.links.push({targetBookId:book.id,targetChapterIndex:index,type:type==='counterpart'?'counterpart':'previous'});await save(book);if(target.id!==book.id)await save(target);toast('Chapter link saved');manageChapterLinks(book,index)};
  $('modalHost').onclick=async e=>{const btn=e.target.closest('[data-remove-chapter-link]');if(!btn)return;const item=chapter.links?.[Number(btn.dataset.removeChapterLink)];if(!item)return;const target=books().find(b=>b.id===item.targetBookId),other=target?.chapters?.[Number(item.targetChapterIndex)];chapter.links=chapter.links.filter(x=>!(x.targetBookId===item.targetBookId&&Number(x.targetChapterIndex)===Number(item.targetChapterIndex)));if(other){other.links=(other.links||[]).filter(x=>!(x.targetBookId===book.id&&Number(x.targetChapterIndex)===index));await save(target)}await save(book);manageChapterLinks(book,index)};
 });
}

export function renderReaderLinks(){
 const host=$('chapterLinkNav');if(!host)return;const chapter=state.book?.chapters?.[state.chapter];const links=chapter?.links||[];
 host.innerHTML=links.map((l,i)=>{const target=books().find(b=>b.id===l.targetBookId),idx=Number(l.targetChapterIndex);if(!target?.chapters?.[idx])return '';const direction=l.type==='previous'?'←':l.type==='next'?'→':'↔';return '<button type="button" class="linked-chapter '+(l.type==='counterpart'?'counterpart':'sequence')+'" data-open-linked-book="'+esc(target.id)+'" data-open-linked-chapter="'+idx+'" title="'+esc(title(target)+' · '+chapterTitle(target,idx))+'"><span>'+direction+'</span><span class="linked-chapter-text">'+esc(title(target))+'<small>'+esc(chapterTitle(target,idx))+'</small></span></button>'}).join('')+'<button type="button" class="chapter-link-manage" data-manage-current-chapter>＋ Manage links</button>';
 host.classList.toggle('hidden',false);
}
export function openLinkedChapter(bookId,index){const target=books().find(b=>b.id===bookId);if(!target)return toast('Linked novel is no longer in your library');state.book=target;openReader(Number(index));}
