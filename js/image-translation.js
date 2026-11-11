import {$,esc,toast,modal,closeModal} from './utils.js';
import {translateImageText,getImageTranslationSources} from './translation.js';

const overlays=new Map();
let worker=null,workerLanguage='';
export function renderImageTranslationOverlay(image,transform={panX:0,panY:0,viewerZoom:1}){
 const root=$('imageTranslationOverlay'),img=$('imageViewerImage');if(!root||!img)return;
 const items=overlays.get(image?.id)||[];
 const draw=()=>{
  if(!img.isConnected||!img.naturalWidth||!img.naturalHeight)return;
  const width=img.clientWidth,height=img.clientHeight;
  const scale=Math.min(width/img.naturalWidth,height/img.naturalHeight);
  const renderedWidth=img.naturalWidth*scale,renderedHeight=img.naturalHeight*scale;
  const offsetX=(width-renderedWidth)/2,offsetY=(height-renderedHeight)/2;
  root.style.inset='0';
  root.style.width='100%';root.style.height='100%';
  root.innerHTML=items.map(item=>{
   const left=(offsetX+item.left*renderedWidth)/width*100;
   const top=(offsetY+item.top*renderedHeight)/height*100;
   const boxWidth=item.width*renderedWidth/width*100,boxHeight=item.height*renderedHeight/height*100;
   return '<div class="image-translation-label" style="left:'+left+'%;top:'+top+'%;width:'+boxWidth+'%;height:'+boxHeight+'%">'+esc(item.text)+'</div>';
  }).join('');
  root.style.transform='translate3d('+transform.panX+'px,'+transform.panY+'px,0) scale('+transform.viewerZoom+')';
 };
 if(img.complete)draw();else img.addEventListener('load',draw,{once:true});
}
export function openImageTranslation(image){
 const sources=getImageTranslationSources();
 if(!sources.length){toast('Add a Google, DeepL, or LibreTranslate API source in Translation sources first');return}
 const viewer=document.querySelector('#modalHost .image-viewer-modal');
 if(!viewer){toast('Fullscreen image viewer is not open');return}
 viewer.querySelector('.image-translation-dialog')?.remove();
 const options=sources.map(source=>'<option value="'+esc(source.id)+'">'+esc(source.name)+'</option>').join('');
 const dialog=document.createElement('div');
 dialog.className='image-translation-dialog';
 dialog.innerHTML='<section class="image-translation-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="imageTranslationTitle"><div class="row between"><h2 id="imageTranslationTitle">Translate image</h2><button type="button" data-image-translation-close aria-label="Close">×</button></div><div class="stack"><p class="muted tiny">OCR runs in your browser. Detected text is sent to the selected translation provider and displayed over the original text. Translation target is always English.</p><label>Text language<select id="imageOcrLanguage"><option value="jpn">Japanese</option><option value="chi_sim">Chinese (Simplified)</option><option value="chi_tra">Chinese (Traditional)</option><option value="kor">Korean</option></select></label><label>Translation source<select id="imageTranslationSource">'+options+'</select></label><div id="imageTranslationProgress" class="muted tiny" aria-live="polite">Ready</div><div class="row"><span class="grow"></span><button type="button" data-start-image-translation class="primary">Detect &amp; translate</button></div></div></section>';
 viewer.append(dialog);
 const dismiss=()=>dialog.remove();
 dialog.addEventListener('click',event=>{if(event.target===dialog||event.target.closest('[data-image-translation-close]'))dismiss()});
 dialog.querySelector('[data-start-image-translation]').onclick=async()=>{
  const button=dialog.querySelector('[data-start-image-translation]'),progress=dialog.querySelector('#imageTranslationProgress'),language=dialog.querySelector('#imageOcrLanguage').value,sourceId=dialog.querySelector('#imageTranslationSource').value;
  button.disabled=true;progress.textContent='Loading OCR engine…';
  try{
   const module=await import('https://esm.sh/tesseract.js@5.1.1');
   if(!worker||workerLanguage!==language){if(worker)await worker.terminate();worker=await module.createWorker(language,1,{logger:event=>{if(event.status)progress.textContent='OCR: '+event.status+(event.progress?' '+Math.round(event.progress*100)+'%':'')}});workerLanguage=language}
   progress.textContent='Recognizing text…';
   const result=await worker.recognize(image.data);
   const lines=(result.data.lines||[]).filter(line=>line.text?.trim()&&line.confidence>=25);
   if(!lines.length)throw new Error('No readable text detected. Try another language or a clearer image.');
   progress.textContent='Translating '+lines.length+' detected regions to English…';
   const joined=lines.map(line=>line.text.trim()).join('\n');
   const translated=await translateImageText(joined,sourceId);
   const width=result.data.imageSize?.width||result.data.width||1,height=result.data.imageSize?.height||result.data.height||1;
   let translatedLines=translated.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
   if(translatedLines.length!==lines.length){
    const box={left:Math.min(...lines.map(line=>line.bbox.x0))/width,top:Math.min(...lines.map(line=>line.bbox.y0))/height,width:(Math.max(...lines.map(line=>line.bbox.x1))-Math.min(...lines.map(line=>line.bbox.x0)))/width,height:(Math.max(...lines.map(line=>line.bbox.y1))-Math.min(...lines.map(line=>line.bbox.y0)))/height,text:translated};
    overlays.set(image.id,[box]);
   }else{
    overlays.set(image.id,lines.map((line,index)=>({left:line.bbox.x0/width,top:line.bbox.y0/height,width:(line.bbox.x1-line.bbox.x0)/width,height:(line.bbox.y1-line.bbox.y0)/height,text:translatedLines[index]||translated})));
   }
   dismiss();renderImageTranslationOverlay(image);toast('Image translated · '+lines.length+' regions');
  }catch(error){progress.textContent=error.message||'Image translation failed';button.disabled=false}
 };
}
