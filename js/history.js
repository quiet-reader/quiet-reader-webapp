import {put} from './db.js';
import {state} from './state.js';
import {$,esc,modal,closeModal} from './utils.js';

const dateTime=value=>Number.isFinite(Number(value))&&Number(value)>0?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(value))):'Date unavailable';
export function addEditEvent(book,action,detail=''){
 if(!book)return;
 book.editHistory=Array.isArray(book.editHistory)?book.editHistory:[];
 book.editHistory.push({action:String(action||'Edited'),detail:String(detail||''),editedAt:Date.now()});
 book.editHistory=book.editHistory.slice(-10);
}
export async function recordReading(book,chapterIndex,offset=0){
 if(!book||!Number.isInteger(Number(chapterIndex)))return;
 const now=Date.now(),chapter=book.chapters?.[Number(chapterIndex)];if(!chapter)return;
 const history=Array.isArray(book.readingHistory)?book.readingHistory:[];
 const last=history[history.length-1];
 if(last&&Number(last.chapterIndex)===Number(chapterIndex)&&now-Number(last.visitedAt)<30000){last.visitedAt=now;last.offset=Math.max(0,Number(offset)||0);last.chapterTitle=chapter.title||'Chapter '+(Number(chapterIndex)+1)}
 else history.push({chapterIndex:Number(chapterIndex),chapterTitle:chapter.title||'Chapter '+(Number(chapterIndex)+1),visitedAt:now,offset:Math.max(0,Number(offset)||0)});
 book.readingHistory=history.slice(-10);await put(book);
 const bookIndex=state.books?.findIndex(item=>item.id===book.id);if(bookIndex>=0)state.books[bookIndex]=book;
}
export function novelHistoryMarkup(book){
 const reads=[...(book?.readingHistory||[])].slice(-10).reverse();
 const edits=[...(book?.editHistory||[])].slice(-10).reverse();
 const reading=reads.map(item=>'<button type="button" class="reading-history-entry" data-open-reading-history="'+esc(book.id)+'" data-history-chapter="'+Number(item.chapterIndex)+'"><span class="reading-history-copy"><b>'+esc(item.chapterTitle||'Chapter '+(Number(item.chapterIndex)+1))+'</b><small>'+esc(dateTime(item.visitedAt))+'</small></span><span class="muted tiny">Open ↗</span></button>').join('');
 const editing=edits.map(item=>'<div class="reading-history-entry edit-history-entry"><span class="reading-history-copy"><b>✎ '+esc(item.action)+'</b><small>'+esc(item.detail||'')+' · '+esc(dateTime(item.editedAt))+'</small></span></div>').join('');
 return (reading?'<h3>Reading · last 10</h3><div class="reading-history-list">'+reading+'</div>':'<div class="empty">No reading history for this novel yet.</div>')+(editing?'<h3>Editing activity · last 10</h3><div class="reading-history-list">'+editing+'</div>':'<p class="muted tiny">No editing activity recorded yet.</p>');
}
export function showUniversalHistory(books,onOpen){
 const entries=(books||[]).flatMap(book=>[
  ...(book.readingHistory||[]).map(item=>({...item,kind:'reading',bookId:book.id,bookTitle:book.title||'Untitled novel'})),
  ...(book.editHistory||[]).map(item=>({...item,kind:'edit',bookId:book.id,bookTitle:book.title||'Untitled novel'}))
 ]).sort((a,b)=>(b.visitedAt||b.editedAt||0)-(a.visitedAt||a.editedAt||0));
 const body=entries.length?'<div class="reading-history-list">'+entries.map(item=>item.kind==='reading'?'<button type="button" class="reading-history-entry" data-global-history-book="'+esc(item.bookId)+'" data-history-chapter="'+Number(item.chapterIndex)+'"><span class="reading-history-copy"><b>'+esc(item.bookTitle)+'</b><small>'+esc(item.chapterTitle||'Chapter '+(Number(item.chapterIndex)+1))+' · '+esc(dateTime(item.visitedAt))+'</small></span><span class="muted tiny">Read ↗</span></button>':'<div class="reading-history-entry edit-history-entry"><span class="reading-history-copy"><b>'+esc(item.bookTitle)+' · ✎ '+esc(item.action)+'</b><small>'+esc(item.detail||'')+' · '+esc(dateTime(item.editedAt))+'</small></span></div>').join('')+'</div>':'<div class="empty">Reading and editing activity will appear here.</div>';
 modal('Reading & editing history',body,()=>{
  document.querySelector('#modalHost .modal')?.classList.add('reading-history-modal');
  $('modalHost').onclick=event=>{const row=event.target.closest('[data-global-history-book]');if(!row)return;const book=(books||[]).find(item=>item.id===row.dataset.globalHistoryBook);if(book&&onOpen){closeModal();onOpen(book,Number(row.dataset.historyChapter))}};
 });
}
