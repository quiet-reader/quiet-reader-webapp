import {state} from './state.js';import {put} from './db.js';import {$,esc,toast,paragraphs} from './utils.js';import {setScreen} from './state.js';import {renderHighlights} from './highlights.js';
export function chapterHTML(ch){
 const images=new Map((ch.images||[]).map(im=>[im.id,im]));
 return paragraphs(ch.text).map(paragraph=>{
  const parts=paragraph.split(/(\[IMAGE:[^\]]+\])/g).map(part=>{
   const match=part.match(/^\[IMAGE:([^\]]+)\]$/);
   if(match){const im=images.get(match[1]);return im?'<figure><img src="'+im.data+'" alt=""><figcaption class="tiny muted">'+esc(im.caption||'')+'</figcaption></figure>':''}
   return esc(part);
  }).join('');
  return /^\[IMAGE:[^\]]+\]$/.test(paragraph)?parts:'<p>'+parts+'</p>';
 }).join('');
}
export function openReader(index){const b=state.book;if(!b?.chapters?.length){toast('Add a chapter first');return}state.chapter=Math.max(0,Math.min(index,b.chapters.length-1));drawReader();setScreen('reader');const saved=b.progress?.chapter===state.chapter?b.progress.offset:0;window.scrollTo(0,saved||0)}
export function drawReader(){const b=state.book,c=b.chapters[state.chapter];if(!c)return;$('readerBookTitle').textContent=b.title;$('chapterKicker').textContent='Chapter '+(state.chapter+1)+' of '+b.chapters.length;$('readingTitle').textContent=c.title||'Chapter '+(state.chapter+1);$('readingBody').innerHTML=chapterHTML(c);renderChapterFormat(chapterFormat);$('jumpChapter').innerHTML=b.chapters.map((x,i)=>'<option value="'+i+'">'+esc(x.title||'Chapter '+(i+1))+'</option>').join('');$('jumpChapter').value=state.chapter;$('prevChapter').disabled=state.chapter===0;$('nextChapter').disabled=state.chapter===b.chapters.length-1;$('chapterCounter').textContent=(state.chapter+1)+' / '+b.chapters.length;renderHighlights()}
export async function saveProgress(){if(!state.book)return;state.book.progress={chapter:state.chapter,offset:window.scrollY};state.book.updated=Date.now();await put(state.book)}
export async function changeChapter(delta){await saveProgress();const next=state.chapter+delta;if(next<0||next>=state.book.chapters.length)return;state.chapter=next;drawReader();window.scrollTo(0,0)}
export async function jumpChapter(index){await saveProgress();state.chapter=Number(index);drawReader();window.scrollTo(0,0)}
export function addBookmark(){const b=state.book;b.bookmarks=b.bookmarks||[];b.bookmarks.push({id:crypto.randomUUID?.()||String(Date.now()),chapter:state.chapter,offset:window.scrollY,text:$('readingTitle').textContent,created:Date.now()});put(b).then(()=>toast('Bookmark saved'))}
let chapterFormat='normal';
let sectionParts=[];
function isEnglish(text){
 const words=String(text||'').toLowerCase().match(/[a-z]+/g)||[];
 if(words.length<5)return false;
 const common=new Set(['the','and','that','this','with','from','have','was','were','you','your','his','her','they','them','their','for','but','not','are','had','has','will','would','could','should','what','when','where','who','how','why','said','she','him','into','then','there','about','one','all','can','been','being','because','which','while','after','before','over','under','out','our','we','he','it','of','to','in','on','as','at','by','is','be','or','an','a']);
 const hits=words.filter(w=>common.has(w)).length;
 return hits>=3&&hits/words.length>=0.035;
}
function splitIntoSections(text,limit=5000){
 const paragraphsList=paragraphs(text);
 const chunks=[];let current='';
 const pushPiece=piece=>{if(!piece)return;if(!current)current=piece;else if(current.length+2+piece.length<=limit)current+='\n\n'+piece;else{chunks.push(current);current=piece}};
 for(const paragraph of paragraphsList){
  let remaining=paragraph;
  while(remaining.length>limit){
   let cut=remaining.lastIndexOf(' ',limit);
   if(cut<1)cut=limit;
   pushPiece(remaining.slice(0,cut).trim());
   remaining=remaining.slice(cut).trim();
   if(current){chunks.push(current);current=''}
  }
  pushPiece(remaining);
 }
 if(current)chunks.push(current);
 return chunks;
}

export function renderChapterFormat(mode=chapterFormat){
 chapterFormat=mode;
 const controls=$('chapterFormatControls'),view=$('sectionView');
 if(!controls||!view)return;
 const chapter=state.book?.chapters?.[state.chapter];
 const hasText=Boolean(chapter?.text?.trim());
 controls.classList.toggle('hidden',!hasText);
 view.classList.add('hidden');view.innerHTML='';
 controls.querySelectorAll('[data-chapter-format]').forEach(b=>b.classList.toggle('active',b.dataset.chapterFormat===chapterFormat));
 if(!hasText){chapterFormat='normal';return}
 if(chapterFormat!=='sections')return;
 sectionParts=splitIntoSections(chapter.text,5000);
 view.innerHTML=sectionParts.map((part,i)=>'<section class="reading-section"><div class="section-heading-row"><b>Section '+(i+1)+' <span class="muted tiny">· '+part.length.toLocaleString()+' characters</span></b><div class="row"><button type="button" data-copy-section="'+i+'">Copy section</button><button type="button" data-toggle-section="'+i+'">Expand</button></div></div><div class="section-content hidden"><p>'+esc(part).replace(/\n/g,'<br>')+'</p></div></section>').join('');
 view.classList.remove('hidden');
}
export async function copySection(index){
 const text=sectionParts[Number(index)];
 if(text==null)return toast('Section not found');
 try{await navigator.clipboard.writeText(text);toast('Section copied')}
 catch{const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();toast(ok?'Section copied':'Could not copy section')}
}
export function toggleSection(index,button){
 const content=$('sectionView')?.querySelectorAll('.section-content')[Number(index)];
 if(!content)return;
 content.classList.toggle('hidden');
 button.textContent=content.classList.contains('hidden')?'Expand':'Collapse';
}
