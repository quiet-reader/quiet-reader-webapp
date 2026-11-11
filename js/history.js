import {put} from './db.js';
import {state} from './state.js';
import {$,esc,modal,closeModal} from './utils.js';

const dateTime=value=>Number.isFinite(Number(value))&&Number(value)>0?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(value))):'Date unavailable';

export async function recordReading(book,chapterIndex,offset=0){
 if(!book||!Number.isInteger(Number(chapterIndex)))return;
 const now=Date.now(),chapter=book.chapters?.[Number(chapterIndex)];
 if(!chapter)return;
 const history=Array.isArray(book.readingHistory)?book.readingHistory:[];
 const last=history[history.length-1];
 if(last&&Number(last.chapterIndex)===Number(chapterIndex)&&now-Number(last.visitedAt)<30000){
  last.visitedAt=now;last.offset=Math.max(0,Number(offset)||0);last.chapterTitle=chapter.title||'Chapter '+(Number(chapterIndex)+1);
 }else{
  history.push({chapterIndex:Number(chapterIndex),chapterTitle:chapter.title||'Chapter '+(Number(chapterIndex)+1),visitedAt:now,offset:Math.max(0,Number(offset)||0)});
 }
 book.readingHistory=history.slice(-10);
 await put(book);
 const bookIndex=state.books?.findIndex(item=>item.id===book.id);if(bookIndex>=0)state.books[bookIndex]=book;
}

export function novelHistoryMarkup(book){
 const entries=[...(book?.readingHistory||[])].slice(-10).reverse();
 if(!entries.length)return '<div class="empty">No reading history for this novel yet.</div>';
 return '<div class="reading-history-list">'+entries.map(item=>'<button type="button" class="reading-history-entry" data-open-reading-history="'+esc(book.id)+'" data-history-chapter="'+Number(item.chapterIndex)+'"><span class="reading-history-copy"><b>'+esc(item.chapterTitle||'Chapter '+(Number(item.chapterIndex)+1))+'</b><small>'+esc(dateTime(item.visitedAt))+'</small></span><span class="muted tiny">Open ↗</span></button>').join('')+'</div>';
}

export function showUniversalHistory(books,onOpen){
 const entries=(books||[]).flatMap(book=>(book.readingHistory||[]).map(item=>({...item,bookId:book.id,bookTitle:book.title||'Untitled novel'}))).sort((a,b)=>(b.visitedAt||0)-(a.visitedAt||0));
 const body=entries.length?'<div class="reading-history-list">'+entries.map(item=>'<button type="button" class="reading-history-entry" data-global-history-book="'+esc(item.bookId)+'" data-history-chapter="'+Number(item.chapterIndex)+'"><span class="reading-history-copy"><b>'+esc(item.bookTitle)+'</b><small>'+esc(item.chapterTitle||'Chapter '+(Number(item.chapterIndex)+1))+' · '+esc(dateTime(item.visitedAt))+'</small></span><span class="muted tiny">Open ↗</span></button>').join('')+'</div>':'<div class="empty">Your reading history will appear here as you read.</div>';
 modal('Reading history',body,()=>{
  document.querySelector('#modalHost .modal')?.classList.add('reading-history-modal');
  $('modalHost').onclick=event=>{
   const row=event.target.closest('[data-global-history-book]');
   if(!row)return;
   const book=(books||[]).find(item=>item.id===row.dataset.globalHistoryBook);
   if(book&&onOpen){closeModal();onOpen(book,Number(row.dataset.historyChapter))}
  };
 });
}
