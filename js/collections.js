import {itemRepository} from './infrastructure/persistence/item-repository.js';
import {$,esc,toast} from './utils.js';
const KEY='qrCollections';
function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function write(value){localStorage.setItem(KEY,JSON.stringify(value))}
function makeId(){return crypto.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2))}
async function resolve(ref,items){
 const book=items.find(item=>item.id===ref.bookId&&item.kind==='book');if(!book)return null;
 if(ref.type==='book')return {book,label:book.title||'Untitled book'};
 if(ref.type==='chapter'){const chapter=(book.chapters||[]).find(item=>item.id===ref.chapterId);return chapter?{book,label:(book.title||'Novel')+' — '+(chapter.title||'Chapter')}:null}
 if(ref.type==='image'){const image=(book.gallery?.images||[]).find(item=>item.id===ref.imageId);return image?{book,label:(book.title||'Gallery')+' — '+(image.name||'Image')}:null}
 return null;
}
export async function addToCollection(type,book,childIndex=null){
 if(!book)return;
 let child=null;
 if(type==='chapter'){child=(book.chapters||[])[Number(childIndex)];if(!child)return;if(!child.id)child.id=makeId()}
 if(type==='image'){child=(book.gallery?.images||[])[Number(childIndex)];if(!child)return;if(!child.id)child.id=makeId()}
 if(child)await itemRepository.save(book);
 const collections=read(),choice=prompt('Enter a collection name (existing or new):',collections[0]?.name||'');
 if(choice===null)return;
 const name=choice.trim();if(!name)return toast('Collection name is required');
 let collection=collections.find(item=>String(item.name).toLocaleLowerCase()===name.toLocaleLowerCase());
 if(!collection){collection={id:makeId(),name,createdAt:new Date().toISOString(),items:[]};collections.push(collection)}
 const ref={type,bookId:book.id};if(type==='chapter')ref.chapterId=child.id;if(type==='image')ref.imageId=child.id;
 if(!collection.items.some(item=>item.type===ref.type&&item.bookId===ref.bookId&&(item.chapterId||'')===(ref.chapterId||'')&&(item.imageId||'')===(ref.imageId||''))collection.items.push(ref);
 write(collections);toast('Added to '+collection.name);
}
export async function togglePin(book){book.pinned=!book.pinned;book.updated=Date.now();await itemRepository.save(book);toast(book.pinned?'Pinned at the top of this category':'Unpinned')}
export async function toggleFavorite(book){book.favorite=!book.favorite;book.updated=Date.now();await itemRepository.save(book);toast(book.favorite?'Added to favourites':'Removed from favourites')}
export async function renderCollections(host){
 if(!host)return;
 const items=await itemRepository.getAll(),collections=read();let changed=false;
 for(const collection of collections){const valid=[];for(const ref of collection.items||[]){if(await resolve(ref,items))valid.push(ref);else changed=true}collection.items=valid}
 if(changed)write(collections);
 if(!collections.length){host.innerHTML='<div class="empty">No collections yet. Use “＋ Collection” on a book, chapter or gallery image to create one.</div>';return}
 host.innerHTML=collections.map(collection=>'<section class="collection-card"><div class="row between"><div><h3>'+esc(collection.name)+'</h3><span class="tiny muted">'+collection.items.length+' linked items</span></div><button type="button" data-delete-collection="'+esc(collection.id)+'" aria-label="Delete collection">×</button></div><div class="collection-items">'+collection.items.map(ref=>{const book=items.find(item=>item.id===ref.bookId);let label=book?.title||'Linked item';if(ref.type==='chapter')label+=' — '+((book?.chapters||[]).find(ch=>ch.id===ref.chapterId)?.title||'Chapter');if(ref.type==='image')label+=' — '+((book?.gallery?.images||[]).find(image=>image.id===ref.imageId)?.name||'Image');return '<button type="button" class="collection-item" data-collection-open="'+esc(ref.bookId)+'" data-collection-type="'+esc(ref.type)+'" data-collection-child="'+esc(ref.chapterId||ref.imageId||'')+'">'+esc(label)+' <span class="tiny muted">↗</span></button>'}).join('')||'<p class="tiny muted">This collection is empty.</p>'}</div></section>').join('');
 host.onclick=e=>{const del=e.target.closest('[data-delete-collection]');if(del){if(confirm('Delete this collection? Original library items will not be affected.')){write(read().filter(item=>item.id!==del.dataset.deleteCollection));renderCollections(host)}return}const open=e.target.closest('[data-collection-open]');if(open)host.dispatchEvent(new CustomEvent('collection-open',{bubbles:true,detail:{bookId:open.dataset.collectionOpen,type:open.dataset.collectionType,childId:open.dataset.collectionChild}}))};
}
