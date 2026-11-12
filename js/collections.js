import {itemRepository} from './infrastructure/persistence/item-repository.js';
import {esc,toast,modal,closeModal} from './utils.js';
const KEY='qrCollections';
function readCollections(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function writeCollections(value){localStorage.setItem(KEY,JSON.stringify(value))}
function makeId(){return globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2))}
function referenceFor(type,book,childIndex=null){
 const ref={type,bookId:book.id};
 if(type==='chapter'){const child=(book.chapters||[])[Number(childIndex)];if(!child)return null;if(!child.id)child.id=makeId();ref.chapterId=child.id}
 if(type==='image'){const child=(book.gallery?.images||[])[Number(childIndex)];if(!child)return null;if(!child.id)child.id=makeId();ref.imageId=child.id}
 return ref;
}
function sameReference(a,b){return a.type===b.type&&a.bookId===b.bookId&&(a.chapterId||'')===(b.chapterId||'')&&(a.imageId||'')===(b.imageId||'')}
export function getItemCollectionNames(type,book,childIndex=null){
 const ref=referenceFor(type,book,childIndex);if(!ref)return [];
 const collections=readCollections();
 return collections.filter(collection=>(collection.items||[]).some(item=>sameReference(item,ref))).map(collection=>collection.name);
}
export async function addToCollection(type,book,childIndex=null){
 if(!book)return;
 const ref=referenceFor(type,book,childIndex);if(!ref)return;
 if(type!=='book')await itemRepository.save(book);
 let collections=readCollections(),query='';
 const render=()=>{
  collections=readCollections();
  const filtered=collections.filter(collection=>collection.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const selected=collection=>collection.items.some(item=>sameReference(item,ref));
  $('collectionPickerList').innerHTML=filtered.length?filtered.map(collection=>'<button type="button" class="collection-picker-option '+(selected(collection)?'selected':'')+'" data-picker-collection="'+esc(collection.id)+'"><span>'+esc(collection.name)+'</span><span class="collection-picker-check">'+(selected(collection)?'✓ Added':'＋ Add')+'</span></button>').join(''):'<p class="tiny muted">No matching collections. Create a new one below.</p>';
  $('collectionPickerCount').textContent=collections.length+' collection'+(collections.length===1?'':'s');
 };
 modal('Add to collection','<div class="collection-picker stack"><label>Search collections<input id="collectionPickerSearch" type="search" placeholder="Find a collection…" autocomplete="off"></label><div class="tiny muted" id="collectionPickerCount"></div><div id="collectionPickerList" class="collection-picker-list"></div><hr><label>New collection<input id="collectionPickerNewName" maxlength="60" placeholder="Collection name"></label><div class="row"><span class="grow"></span><button type="button" id="collectionPickerCreate" class="primary">＋ Create & add</button></div></div>',()=>{
  $('collectionPickerSearch').oninput=event=>{query=event.target.value.trim();render()};
  $('collectionPickerList').onclick=event=>{
   const button=event.target.closest('[data-picker-collection]');if(!button)return;
   const collection=readCollections().find(item=>item.id===button.dataset.pickerCollection);if(!collection)return;
   const index=collection.items.findIndex(item=>sameReference(item,ref));
   if(index>=0){collection.items.splice(index,1);toast('Removed from '+collection.name)}
   else{collection.items.push(ref);toast('Added to '+collection.name)}
   writeCollections(readCollections().map(item=>item.id===collection.id?collection:item));render();
  };
  $('collectionPickerCreate').onclick=()=>{
   const name=$('collectionPickerNewName').value.trim();if(!name)return toast('Enter a collection name');
   const all=readCollections();if(all.some(item=>item.name.toLocaleLowerCase()===name.toLocaleLowerCase()))return toast('A collection with that name already exists');
   all.push({id:makeId(),name,createdAt:new Date().toISOString(),items:[ref]});writeCollections(all);$('collectionPickerNewName').value='';toast('Created '+name);render();
  };
  render();
 });
}
export async function togglePin(book){book.pinned=!book.pinned;book.updated=Date.now();await itemRepository.save(book);toast(book.pinned?'Pinned at the top of this category':'Unpinned')}
export async function toggleFavorite(book){book.favorite=!book.favorite;book.updated=Date.now();await itemRepository.save(book);toast(book.favorite?'Added to favourites':'Removed from favourites')}
export async function renderCollections(host){
 if(!host)return;
 const items=await itemRepository.getAll(),collections=readCollections();let changed=false;
 for(const collection of collections){const valid=[];for(const ref of collection.items||[]){const book=items.find(item=>item.id===ref.bookId&&item.kind==='book');let exists=!!book;if(exists&&ref.type==='chapter')exists=(book.chapters||[]).some(chapter=>chapter.id===ref.chapterId);else if(exists&&ref.type==='image')exists=(book.gallery?.images||[]).some(image=>image.id===ref.imageId);else if(exists&&ref.type!=='book')exists=false;if(exists)valid.push(ref);else changed=true}collection.items=valid}
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
  return '<details class="collection-accordion"><summary><span>'+esc(collection.name)+'</span><small>'+collection.items.length+' item'+(collection.items.length===1?'':'s')+'</small></summary><div class="collection-accordion-content"><div class="collection-items">'+(rows||'<p class="tiny muted">This collection is empty.</p>')+'</div><button type="button" class="danger collection-delete" data-delete-collection="'+esc(collection.id)+'">Delete collection</button></div></details>';
 }).join('');
 host.onclick=event=>{
  const remove=event.target.closest('[data-delete-collection]');
  if(remove){if(confirm('Delete this collection? Original library items will not be affected.')){writeCollections(readCollections().filter(item=>item.id!==remove.dataset.deleteCollection));void renderCollections(host)}return}
  const open=event.target.closest('[data-collection-open]');
  if(open)host.dispatchEvent(new CustomEvent('collection-open',{bubbles:true,detail:{bookId:open.dataset.collectionOpen,type:open.dataset.collectionType,childId:open.dataset.collectionChild}}));
 };
}
