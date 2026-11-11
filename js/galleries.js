import {state,freshBook} from './state.js';
import {put} from './db.js';
import {$,esc,toast,modal,closeModal,dataURL,uid} from './utils.js';
import {refresh,openBook,setBookTab,drawBook} from './library.js';

let sliderIndex=0;
const imageFiles=files=>[...files].filter(file=>file.type?.startsWith('image/')||/\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(file.name)).sort((a,b)=>new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}).compare(a.webkitRelativePath||a.name,b.webkitRelativePath||b.name));

export function createGallery(){
 modal('Create an image gallery','<div class="stack"><label>Gallery title<input id="newGalleryTitle" placeholder="Gallery title"></label><label>Author / source (optional)<input id="newGalleryAuthor"></label><label>Tags (comma-separated)<input id="newGalleryTags" placeholder="art, reference, characters"></label><p class="muted tiny">Create the gallery first, then add individual images or an entire folder. GIFs remain animated.</p><button id="createGalleryNow" class="primary">Create gallery</button></div>',()=>{
  $('createGalleryNow').onclick=async()=>{
   const book=freshBook('gallery',$('newGalleryTitle').value.trim()||'Untitled gallery');
   book.author=$('newGalleryAuthor').value.trim();
   book.tags=[...new Set($('newGalleryTags').value.split(',').map(tag=>tag.trim().replace(/^#/,'')).filter(Boolean))];
   book.gallery={images:[],view:'grid'};
   await put(book);await refresh();closeModal();openBook(book.id);setBookTab('gallery');renderGallery();toast('Gallery created');
  };
 });
}

export function addGalleryImages(){if(!state.book||state.book.locked)return toast('Unlock editing first');$('galleryImageFiles')?.click()}
export function addGalleryFolder(){if(!state.book||state.book.locked)return toast('Unlock editing first');$('galleryFolderFiles')?.click()}

export async function importGalleryFiles(fileList){
 const book=state.book;if(!book||book.locked)return toast('Unlock editing first');
 const files=imageFiles(fileList||[]);if(!files.length)return toast('No supported images found');
 book.gallery=book.gallery||{images:[],view:'grid'};book.gallery.images=book.gallery.images||[];
 let added=0;
 for(const file of files){
  try{const data=await dataURL(file);book.gallery.images.push({id:uid(),name:(file.webkitRelativePath||file.name).split('/').pop(),data,mime:file.type||'application/octet-stream',size:file.size,addedAt:Date.now()});added++}
  catch(error){console.warn('Could not import gallery image',file.name,error)}
 }
 if(!book.cover&&book.gallery.images[0])book.cover=book.gallery.images[0].data;
 book.updated=Date.now();await put(book);await refresh();drawBook();setBookTab('gallery');renderGallery();
 toast(added+' image'+(added===1?'':'s')+' added'+(added<files.length?' · '+(files.length-added)+' failed':''));
}

async function copyImage(index){
 const image=state.book?.gallery?.images?.[index];if(!image)return;
 try{
  const response=await fetch(image.data),blob=await response.blob();
  if(navigator.clipboard?.write&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({[blob.type||'image/png']:blob})]);toast('Image copied')}
  else{await navigator.clipboard.writeText(image.data);toast('Image data URL copied')}
 }catch(error){toast('Could not copy image in this browser')}
}

export function renderGallery(){
 const book=state.book,host=$('galleryContent');if(!host||!book)return;
 const gallery=book.gallery||{images:[],view:'grid'},images=gallery.images||[],view=gallery.view==='slider'?'slider':'grid';
 host.innerHTML='<div class="gallery-toolbar"><div class="row wrap"><button type="button" data-gallery-view="grid" class="'+(view==='grid'?'active':'')+'">▦ Grid</button><button type="button" data-gallery-view="slider" class="'+(view==='slider'?'active':'')+'">▣ Slideshow</button><span class="muted tiny">'+images.length+' image'+(images.length===1?'':'s')+'</span><span class="grow"></span><button type="button" data-gallery-add>＋ Add images</button><button type="button" data-gallery-folder>＋ Add folder</button></div></div>';
 if(!images.length){host.innerHTML+='<div class="empty">This gallery is empty. Add images or a folder to get started.</div>';return}
 if(view==='grid'){
  host.innerHTML+='<div class="gallery-grid">'+images.map((image,index)=>'<figure class="gallery-card"><img loading="lazy" src="'+image.data+'" alt="'+esc(image.name||'Gallery image')+'"><figcaption><span title="'+esc(image.name||'')+'">'+esc(image.name||'Image '+(index+1))+'</span><button type="button" class="gallery-copy" data-gallery-copy="'+index+'" aria-label="Copy image" title="Copy image">▢</button></figcaption></figure>').join('')+'</div>';
 }else{
  sliderIndex=Math.max(0,Math.min(images.length-1,sliderIndex));
  const image=images[sliderIndex];
  host.innerHTML+='<div class="gallery-slider"><button type="button" data-gallery-prev '+(sliderIndex===0?'disabled':'')+' aria-label="Previous image">‹</button><figure><img src="'+image.data+'" alt="'+esc(image.name||'Gallery image')+'"><figcaption><span>'+esc(image.name||'Image '+(sliderIndex+1))+' · '+(sliderIndex+1)+' / '+images.length+'</span><button type="button" class="gallery-copy" data-gallery-copy="'+sliderIndex+'" aria-label="Copy image" title="Copy image">▢ Copy</button></figcaption></figure><button type="button" data-gallery-next '+(sliderIndex===images.length-1?'disabled':'')+' aria-label="Next image">›</button></div>';
 }
 host.onclick=async event=>{
  const viewButton=event.target.closest('[data-gallery-view]');
  if(viewButton){book.gallery.view=viewButton.dataset.galleryView;await put(book);renderGallery();return}
  if(event.target.closest('[data-gallery-add]')){addGalleryImages();return}
  if(event.target.closest('[data-gallery-folder]')){addGalleryFolder();return}
  const copy=event.target.closest('[data-gallery-copy]');if(copy){await copyImage(Number(copy.dataset.galleryCopy));return}
  if(event.target.closest('[data-gallery-prev]')){sliderIndex=Math.max(0,sliderIndex-1);renderGallery();return}
  if(event.target.closest('[data-gallery-next]')){sliderIndex=Math.min(images.length-1,sliderIndex+1);renderGallery()}
 };
}
