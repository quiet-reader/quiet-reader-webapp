import {itemRepository} from './infrastructure/persistence/item-repository.js';
import {esc,toast} from './utils.js';
const KEY='qrCollections';
function readCollections(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function writeCollections(value){localStorage.setItem(KEY,JSON.stringify(value))}
function makeId(){return globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2))}
async function resolveReference(ref,items){
 const book=items.find(item=>item.id===ref.bookId&&item.kind==='book');if(!book)return null;
 if(ref.type==='book')return {book};
 if(ref.type==='chapter')return (book.chapters||[]).some(chapter=>chapter.id===ref.chapterId)?{book}:null;
 if(ref.type==='image')return (book.gallery?.images||[]).some(image=>image.id===ref.imageId)?{book}:null;
 return null;
}
export async function addToCollection(type,book,childIndex=null){
 if(!book)return;
 let child=null;
 if(type==='chapter'){child=(book.chapters||[])[Number(childIndex)];if(!child)return;if(!child.id)child.id=makeId()}
 if(type==='image'){child=(book.gallery?.images||[])[Number(childIndex)];if(!child)return;if(!child.id)child.id=makeId()}
 if(child)await itemRepository.save(book);
 const collections=readCollections(),choice=prompt('Enter a collection name (existing or new):',collections[0]?.name||'');
 if(choice===null)return;
 const name=choice.trim();if(!name)return toast('Collection name is required');
 let collection=collections.find(item=>String(item.name).toLocaleLowerCase()===name.toLocaleLowerCase());
 if(!collection){collection={id:makeId(),name,createdAt:new Date().toISOString(),items:[]};collections.push(collection)}
 const ref={type,bookId:book.id};if(type==='chapter')ref.chapterId=child.id;if(type==='image')ref.imageId=child.id;
 const duplicate=collection.items.some(item=>item.type===ref.type&&item.bookId===ref.bookId&&(item.chapterId||'')===(ref.chapterId||'')&&(item.imageId||'')===(ref.imageId||''));
 if(!duplicate)collection.items.push(ref);
 writeCollections(collections);toast('Added to '+collection.name);
}
export async function togglePin(book){book.pinned=!book.pinned;book.updated=Date.now();await itemRepository.save(book);toast(book.pinned?'Pinned at the top of this category':'Unpinned')}
export async function toggleFavorite(book){book.favorite=!book.favorite;book.updated=Date.now();await itemRepository.save(book);toast(book.favorite?'Added to favourites':'Removed from favourites')}
export async function renderCollections(host){
 if(!host)return;
 const items=await itemRepository.getAll(),collections=readCollections();let changed=false;
 for(const collection of collections){const valid=[];for(const ref of collection.items||[]){if(await resolveReference(ref,items))valid.push(ref);else changed=true}collection.items=valid}
 if(changed)writeCollections(collections);
 if(!collections.length){host.innerHTML='<div class="empty">No collections yet. Use “＋ Collection” on a book, chapter or gallery image to create one.</div>';return}
 host.innerHTML=collections.map(collection=>{
  const rows=(collection.items||[]).map(ref=>{
   const book=items.find(item=>item.id===ref.bookId);let label=book?.title||'Linked item';
   if(ref.type==='chapter')label+=' — '+((book?.chapters||[]).find(chapter=>chapter.id===ref.chapterId)?.title||'Chapter');
   if(ref.type==='image')label+=' — '+((book?.gallery?.images||[]).find(image=>image.id===ref.imageId)?.name||'Image');
   const childId=ref.chapterId||ref.imageId||'';
   return '<button type="button" class="collection-item" data-collection-open="'+esc(ref.bookId)+'" data-collection-type="'+esc(ref.type)+'" data-collection-child="'+esc(childId)+'">'+esc(label)+' <span class="tiny muted">↗</span></button>';
  }).join('');
  return '<section class="collection-card"><div class="row between"><div><h3>'+esc(collection.name)+'</h3><span class="tiny muted">'+collection.items.length+' linked items</span></div><button type="button" data-delete-collection="'+esc(collection.id)+'" aria-label="Delete collection">×</button></div><div class="collection-items">'+(rows||'<p class="tiny muted">This collection is empty.</p>')+'</div></section>';
 }).join('');
 host.onclick=event=>{
  const remove=event.target.closest('[data-delete-collection]');
  if(remove){if(confirm('Delete this collection? Original library items will not be affected.')){writeCollections(readCollections().filter(item=>item.id!==remove.dataset.deleteCollection));void renderCollections(host)}return}
  const open=event.target.closest('[data-collection-open]');
  if(open)host.dispatchEvent(new CustomEvent('collection-open',{bubbles:true,detail:{bookId:open.dataset.collectionOpen,type:open.dataset.collectionType,childId:open.dataset.collectionChild}}));
 };
}
