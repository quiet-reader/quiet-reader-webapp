import {state,freshBook} from './state.js';
import {put} from './db.js';
import {$,esc,toast,modal,closeModal,dataURL,uid} from './utils.js';
import {refresh,openBook,setBookTab,drawBook} from './library.js';

let sliderIndex=0;
let viewerKeyHandler=null;
const imageFiles=files=>[...files].filter(file=>file.type?.startsWith('image/')||/\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(file.name)).sort((a,b)=>new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}).compare(a.webkitRelativePath||a.name,b.webkitRelativePath||b.name));
const dateTime=value=>Number.isFinite(Number(value))&&Number(value)>0?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(value))):'Not opened yet';
function ensureGallery(book){
 book.gallery=book.gallery||{images:[],view:'grid',history:[],createdAt:Date.now(),lastOpenedAt:null};
 book.gallery.images=book.gallery.images||[];
 book.gallery.history=book.gallery.history||[];if(!book.gallery.createdAt)book.gallery.createdAt=book.createdAt||book.updated||Date.now();
 for(const image of book.gallery.images){if(!image.id)image.id=uid();if(!image.addedAt)image.addedAt=book.createdAt||book.updated||Date.now();if(!Array.isArray(image.history))image.history=[]}
 return book.gallery;
}
async function persist(book){book.updated=Date.now();await put(book);const index=state.books.findIndex(item=>item.id===book.id);if(index>=0)state.books[index]=book}
export function createGallery(){
 let selectedFiles=[];
 const body='<div class="stack"><label>Gallery title<input id="newGalleryTitle" placeholder="Gallery title"></label><label>Author / source (optional)<input id="newGalleryAuthor"></label><label>Tags (comma-separated)<input id="newGalleryTags" placeholder="art, reference, characters"></label><p class="muted tiny">Choose images or a folder. GIFs remain animated. You can also create an empty gallery and add images later.</p><div class="row wrap"><button type="button" id="selectGalleryImages">Choose images</button><button type="button" id="selectGalleryFolder">Choose folder</button><span id="gallerySelectionCount" class="tiny muted">No images selected</span></div><input id="newGalleryImageFiles" type="file" accept="image/*" multiple hidden><input id="newGalleryFolderFiles" type="file" accept="image/*" webkitdirectory directory multiple hidden><button id="createGalleryNow" class="primary">Create gallery</button></div>';
 modal('Create an image gallery',body,()=>{
  $('selectGalleryImages').onclick=()=>$('newGalleryImageFiles').click();
  $('selectGalleryFolder').onclick=()=>$('newGalleryFolderFiles').click();
  const updateSelection=files=>{selectedFiles=imageFiles(files);$('gallerySelectionCount').textContent=selectedFiles.length+' image'+(selectedFiles.length===1?'':'s')+' selected'};
  $('newGalleryImageFiles').onchange=e=>updateSelection(e.target.files);
  $('newGalleryFolderFiles').onchange=e=>updateSelection(e.target.files);
  $('createGalleryNow').onclick=async()=>{
   const book=freshBook('gallery',$('newGalleryTitle').value.trim()||'Untitled gallery');
   book.author=$('newGalleryAuthor').value.trim();
   book.tags=[...new Set($('newGalleryTags').value.split(',').map(tag=>tag.trim().replace(/^#/,'')).filter(Boolean))];
   book.gallery={images:[],view:'grid',history:[],createdAt:Date.now(),lastOpenedAt:null};
   for(const file of selectedFiles){try{book.gallery.images.push({id:uid(),name:(file.webkitRelativePath||file.name).split('/').pop(),data:await dataURL(file),mime:file.type||'application/octet-stream',size:file.size,addedAt:Date.now(),lastOpenedAt:null,notes:'',locked:false,history:[]})}catch(error){console.warn('Could not import gallery image',file.name,error)}}
   if(book.gallery.images[0])book.cover=book.gallery.images[0].data;
   await put(book);await refresh();closeModal();openBook(book.id);setBookTab('gallery');renderGallery();toast('Gallery created · '+book.gallery.images.length+' images');
  };
 });
}
export function addGalleryImages(){if(!state.book||state.book.locked)return toast('Unlock editing first');$('galleryImageFiles')?.click()}
export function addGalleryFolder(){if(!state.book||state.book.locked)return toast('Unlock editing first');$('galleryFolderFiles')?.click()}
export async function importGalleryFiles(fileList){
 const book=state.book;if(!book||book.locked)return toast('Unlock editing first');
 const files=imageFiles(fileList||[]);if(!files.length)return toast('No supported images found');
 const gallery=ensureGallery(book);let added=0;
 for(const file of files){try{gallery.images.push({id:uid(),name:(file.webkitRelativePath||file.name).split('/').pop(),data:await dataURL(file),mime:file.type||'application/octet-stream',size:file.size,addedAt:Date.now(),lastOpenedAt:null,notes:'',locked:false,history:[]});added++}catch(error){console.warn('Could not import gallery image',file.name,error)}}
 if(!book.cover&&gallery.images[0])book.cover=gallery.images[0].data;
 await persist(book);await refresh();drawBook();setBookTab('gallery');renderGallery();
 toast(added+' image'+(added===1?'':'s')+' added'+(added<files.length?' · '+(files.length-added)+' failed':''));
}
async function copyImage(image){
 if(!image)return;
 try{const response=await fetch(image.data),blob=await response.blob();if(navigator.clipboard?.write&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({[blob.type||'image/png']:blob})]);toast('Image copied');return}}catch(error){}
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(image.data);toast('Image data URL copied · image clipboard unavailable')}else toast('Image clipboard is unavailable in this browser')}catch(error){toast('Could not copy image in this browser')}
}
async function openImage(index){
 const book=state.book,gallery=ensureGallery(book),image=gallery.images[index];if(!image)return;
 const now=Date.now();image.lastOpenedAt=now;gallery.lastOpenedAt=now;
 image.history=(image.history||[]).concat({openedAt:now}).slice(-10);
 gallery.history=gallery.history.concat({imageId:image.id,imageName:image.name||'Image',openedAt:now}).slice(-10);
 sliderIndex=index;await persist(book);renderGallery();showImageViewer(index);
}
function showImageViewer(index){
 const book=state.book,gallery=ensureGallery(book),images=gallery.images;
 if(!images.length)return;
 sliderIndex=Math.max(0,Math.min(images.length-1,index));
 const body='<div class="image-viewer"><div class="image-viewer-stage" id="imageViewerStage"></div><div class="image-viewer-filmstrip" id="imageViewerFilmstrip"></div><div class="image-viewer-meta" id="imageViewerMeta"></div><details class="image-viewer-details" open id="imageViewerDetails"><summary>Image notes & details</summary><div id="imageViewerDetailContent"></div></details></div>';
 const updateViewer=()=>{
  const current=images[sliderIndex],prev=images[sliderIndex-1],next=images[sliderIndex+1];
  const stage=$('imageViewerStage');
  if(!stage)return;
  stage.innerHTML=(prev?'<button type="button" class="image-side-preview previous" data-viewer-prev aria-label="Previous image"><img src="'+prev.data+'" alt=""><span>‹</span></button>':'<span class="image-side-spacer"></span>')+'<figure class="image-viewer-current"><div class="image-viewer-image-wrap"><img id="imageViewerImage" src="'+current.data+'" alt="'+esc(current.name||'Gallery image')+'"></div><figcaption><b>'+esc(current.name||'Image '+(sliderIndex+1))+'</b><span>'+(sliderIndex+1)+' of '+images.length+'</span></figcaption></figure>'+(next?'<button type="button" class="image-side-preview next" data-viewer-next aria-label="Next image"><img src="'+next.data+'" alt=""><span>›</span></button>':'<span class="image-side-spacer"></span>');
  $('imageViewerFilmstrip').innerHTML=images.map((item,i)=>'<button type="button" data-viewer-index="'+i+'" class="'+(i===sliderIndex?'active':'')+'" aria-label="Show image '+(i+1)+'" aria-current="'+(i===sliderIndex?'true':'false')+'"><img src="'+item.data+'" alt=""></button>').join('');
  $('imageViewerMeta').innerHTML='<span>Added: '+esc(dateTime(current.addedAt))+'</span><span>Last opened: '+esc(dateTime(current.lastOpenedAt))+'</span><span>'+(current.locked?'🔒 Image locked':'🔓 Image unlocked')+'</span><span class="image-viewer-zoom-label">Zoom: '+Math.round(viewerZoom*100)+'%</span>';
  $('imageViewerDetailContent').innerHTML='<label>Notes<textarea id="galleryImageNotes" rows="3" '+(book.locked||current.locked?'disabled':'')+'>'+esc(current.notes||'')+'</textarea></label><div class="image-individual-history"><b>Image viewing history · Last 10</b>'+(current.history?.length?current.history.slice(-10).reverse().map(entry=>'<span>'+esc(dateTime(entry.openedAt))+'</span>').join(''):'<span class="muted">No previous views</span>')+'</div><div class="row wrap"><button type="button" id="saveGalleryImageNote" '+(book.locked||current.locked?'disabled':'')+'>Save note</button><span class="grow"></span><button type="button" id="copyViewerImage">Copy image</button><button type="button" id="toggleImageLock" '+(book.locked?'disabled':'')+'>'+(current.locked?'Unlock image':'Lock image')+'</button><button type="button" id="deleteViewerImage" class="danger" '+(book.locked||current.locked?'disabled':'')+'>Delete image</button></div>';
  const image=$('imageViewerImage');if(image)image.style.transform='scale('+viewerZoom+')';
  const strip=$('imageViewerFilmstrip');const active=strip?.querySelector('[data-viewer-index="'+sliderIndex+'"]');active?.scrollIntoView({block:'nearest',inline:'center'});
 };
 let viewerZoom=1;
 const setViewerIndex=async nextIndex=>{
  const next=Math.max(0,Math.min(images.length-1,nextIndex));if(next===sliderIndex)return;
  sliderIndex=next;viewerZoom=1;
  const current=images[sliderIndex],now=Date.now();current.lastOpenedAt=now;gallery.lastOpenedAt=now;
  current.history=(current.history||[]).concat({openedAt:now}).slice(-10);
  gallery.history=(gallery.history||[]).concat({imageId:current.id,imageName:current.name||'Image',openedAt:now}).slice(-10);
  await persist(book);renderGallery();updateViewer();
 };
 modal('Gallery viewer',body,()=>{
  const modalElement=document.querySelector('#modalHost .modal');modalElement?.classList.add('image-viewer-modal');
  const back=document.querySelector('#modalBack');back?.classList.add('image-viewer-backdrop');
  updateViewer();
  const host=$('modalHost');
  host.onclick=async event=>{
   if(event.target.closest('[data-viewer-prev]')){await setViewerIndex(sliderIndex-1);return}
   if(event.target.closest('[data-viewer-next]')){await setViewerIndex(sliderIndex+1);return}
   const thumb=event.target.closest('[data-viewer-index]');if(thumb){await setViewerIndex(Number(thumb.dataset.viewerIndex));return}
   const current=images[sliderIndex];
   if(event.target.closest('#copyViewerImage')){await copyImage(current);return}
   if(event.target.closest('#saveGalleryImageNote')){current.notes=$('galleryImageNotes').value;await persist(book);toast('Image note saved');return}
   if(event.target.closest('#toggleImageLock')){current.locked=!current.locked;await persist(book);updateViewer();renderGallery();toast(current.locked?'Image locked':'Image unlocked');return}
   if(event.target.closest('#deleteViewerImage')){if(current.locked||book.locked)return toast('Unlock this image and gallery before deleting');if(!confirm('Delete this image from the gallery?'))return;images.splice(sliderIndex,1);await persist(book);if(!images.length){if(viewerKeyHandler)document.removeEventListener('keydown',viewerKeyHandler);viewerKeyHandler=null;closeModal();renderGallery();toast('Image deleted');return}sliderIndex=Math.min(sliderIndex,images.length-1);viewerZoom=1;await setViewerIndexAfterDelete();return}
  };
  const setViewerIndexAfterDelete=async()=>{const current=images[sliderIndex],now=Date.now();current.lastOpenedAt=now;gallery.lastOpenedAt=now;current.history=(current.history||[]).concat({openedAt:now}).slice(-10);gallery.history=(gallery.history||[]).concat({imageId:current.id,imageName:current.name||'Image',openedAt:now}).slice(-10);await persist(book);renderGallery();updateViewer()};
  if(viewerKeyHandler)document.removeEventListener('keydown',viewerKeyHandler);
  viewerKeyHandler=event=>{
   if(event.key==='ArrowLeft'){event.preventDefault();setViewerIndex(sliderIndex-1)}
   else if(event.key==='ArrowRight'){event.preventDefault();setViewerIndex(sliderIndex+1)}
   else if(event.key==='Escape'){if(viewerKeyHandler)document.removeEventListener('keydown',viewerKeyHandler);viewerKeyHandler=null}
  };
  document.addEventListener('keydown',viewerKeyHandler);
  const stage=$('imageViewerStage');
  stage?.addEventListener('wheel',event=>{
   if(!event.ctrlKey&&!event.metaKey){event.preventDefault();viewerZoom=Math.max(1,Math.min(4,viewerZoom+(event.deltaY<0?0.15:-0.15)));const image=$('imageViewerImage');if(image)image.style.transform='scale('+viewerZoom+')';const label=document.querySelector('.image-viewer-zoom-label');if(label)label.textContent='Zoom: '+Math.round(viewerZoom*100)+'%'}
  },{passive:false});
  $('modalClose').addEventListener('click',()=>{if(viewerKeyHandler)document.removeEventListener('keydown',viewerKeyHandler);viewerKeyHandler=null},{once:true});
 });
}
function showGalleryHistory(){
 const history=[...(state.book?.gallery?.history||[])].slice(-10).reverse();
 const body=history.length?'<div class="reading-history-list">'+history.map(item=>'<div class="reading-history-entry"><span class="reading-history-copy"><b>'+esc(item.imageName||'Image')+'</b><small>'+esc(dateTime(item.openedAt))+'</small></span></div>').join('')+'</div>':'<div class="empty">No gallery viewing history yet.</div>';
 modal('Gallery history · Last 10',body);
}
export function renderGallery(){
 const book=state.book,host=$('galleryContent');if(!host||!book)return;
 const gallery=ensureGallery(book),images=gallery.images,view=gallery.view==='slider'?'slider':'grid';
 host.innerHTML='<div class="gallery-overview tiny muted">Gallery added '+esc(dateTime(gallery.createdAt))+' · Last opened '+esc(dateTime(gallery.lastOpenedAt))+'</div><div class="gallery-toolbar"><div class="row wrap"><button type="button" data-gallery-view="grid" class="'+(view==='grid'?'active':'')+'">▦ Grid</button><button type="button" data-gallery-view="slider" class="'+(view==='slider'?'active':'')+'">▣ Slideshow</button><span class="muted tiny">'+images.length+' image'+(images.length===1?'':'s')+'</span><button type="button" data-gallery-history>◷ History</button><span class="grow"></span><button type="button" data-gallery-add '+(book.locked?'disabled':'')+'>＋ Add images</button><button type="button" data-gallery-folder '+(book.locked?'disabled':'')+'>＋ Add folder</button></div></div><div class="gallery-lock-note">'+(book.locked?'🔒 This gallery is locked. Unlock editing to change images or notes.':'Gallery unlocked · individual images can also be locked')+'</div>';
 host.onclick=async event=>{
  const viewButton=event.target.closest('[data-gallery-view]');
  if(viewButton){gallery.view=viewButton.dataset.galleryView;await persist(book);renderGallery();return}
  if(event.target.closest('[data-gallery-add]')){addGalleryImages();return}
  if(event.target.closest('[data-gallery-folder]')){addGalleryFolder();return}
  if(event.target.closest('[data-gallery-history]')){showGalleryHistory();return}
  const slideTarget=event.target.closest('[data-gallery-slide-index]');if(slideTarget){sliderIndex=Number(slideTarget.dataset.gallerySlideIndex);renderGallery();return}
  const copy=event.target.closest('[data-gallery-copy]');if(copy){await copyImage(images[Number(copy.dataset.galleryCopy)]);return}
  const card=event.target.closest('[data-gallery-image]');if(card){if(event.target.closest('details,textarea,summary,[data-gallery-copy]'))return;await openImage(Number(card.dataset.galleryImage));return}
  if(event.target.closest('[data-gallery-prev]')){sliderIndex=Math.max(0,sliderIndex-1);renderGallery();return}
  if(event.target.closest('[data-gallery-next]')){sliderIndex=Math.min(images.length-1,sliderIndex+1);renderGallery();return}
 };
 host.onkeydown=async event=>{if(event.key!=='Enter'&&event.key!==' ')return;const card=event.target.closest('[data-gallery-image]');if(!card||event.target.closest('details,textarea,summary'))return;event.preventDefault();await openImage(Number(card.dataset.galleryImage))};
 host.onchange=async event=>{
  const field=event.target.closest('[data-image-note]');if(!field)return;
  const image=images[Number(field.dataset.imageNote)];if(!image||book.locked||image.locked)return;
  image.notes=field.value;await persist(book);toast('Image note saved');
 };
 if(!images.length){host.innerHTML+='<div class="empty">This gallery is empty. Add images or a folder to get started.</div>';return}
 if(view==='grid'){
  host.innerHTML+='<div class="gallery-grid">'+images.map((image,index)=>'<article class="gallery-card '+(image.locked?'is-locked':'')+'" data-gallery-image="'+index+'" tabindex="0" role="button" aria-label="Open '+esc(image.name||'image')+'"><div class="gallery-card-image"><img loading="lazy" src="'+image.data+'" alt="'+esc(image.name||'Gallery image')+'"><span class="gallery-card-open">View image ↗</span></div><div class="gallery-card-caption"><b>'+esc(image.name||'Image '+(index+1))+'</b><span>'+(image.locked?'🔒':'')+'</span></div><div class="gallery-image-dates"><span>Added '+esc(dateTime(image.addedAt))+'</span><span>Opened '+esc(dateTime(image.lastOpenedAt))+'</span></div><details class="gallery-image-details" data-no-open><summary>Details & notes</summary><textarea data-image-note="'+index+'" rows="2" placeholder="Add a note…" '+(book.locked||image.locked?'disabled':'')+'>'+esc(image.notes||'')+'</textarea><div class="row"><button type="button" class="gallery-copy" data-gallery-copy="'+index+'">Copy image</button><span class="grow"></span><span class="tiny muted">'+(image.locked?'Image locked':'')+'</span></div></details></article>').join('')+'</div>';
 }else{
  sliderIndex=Math.max(0,Math.min(images.length-1,sliderIndex));
  const image=images[sliderIndex],prev=images[sliderIndex-1],next=images[sliderIndex+1];
  host.innerHTML+='<div class="gallery-stage">'+(prev?'<button type="button" class="gallery-neighbor previous" data-gallery-prev><img src="'+prev.data+'" alt=""><span>‹</span></button>':'<span class="gallery-neighbor-spacer"></span>')+'<button type="button" class="gallery-slide-main" data-gallery-image="'+sliderIndex+'"><img src="'+image.data+'" alt="'+esc(image.name||'Gallery image')+'"><span class="gallery-slide-caption">'+esc(image.name||'Image')+' · '+(sliderIndex+1)+' of '+images.length+'</span></button>'+(next?'<button type="button" class="gallery-neighbor next" data-gallery-next><img src="'+next.data+'" alt=""><span>›</span></button>':'<span class="gallery-neighbor-spacer"></span>')+'</div><div class="gallery-filmstrip">'+images.map((item,i)=>'<button type="button" data-gallery-slide-index="'+i+'" class="'+(i===sliderIndex?'active':'')+'"><img src="'+item.data+'" alt=""><span>'+(i+1)+'</span></button>').join('')+'</div><div class="gallery-slide-position">'+(sliderIndex+1)+' of '+images.length+' images · '+esc(image.name||'')+'</div>';
 }

}
