import {$,esc,toast,modal,closeModal} from './utils.js';
import {translateImageText,getImageTranslationSources} from './translation.js';

const overlays=new Map();
let worker=null,workerLanguage='';
export function renderImageTranslationOverlay(image,transform={panX:0,panY:0,viewerZoom:1}){
 const root=$('imageTranslationOverlay'),img=$('imageViewerImage');if(!root||!img)return;
 const items=overlays.get(image?.id)||[];
 const draw=()=>{
  if(!img.isConnected)return;
  root.style.left=img.offsetLeft+'px';root.style.top=img.offsetTop+'px';
  root.style.width=img.clientWidth+'px';root.style.height=img.clientHeight+'px';
  root.innerHTML=items.map(item=>'<div class="image-translation-label" style="left:'+item.left*100+'%;top:'+item.top*100+'%;width:'+item.width*100+'%;height:'+item.height*100+'%">'+esc(item.text)+'</div>').join('');
  root.style.transform='translate3d('+transform.panX+'px,'+transform.panY+'px,0) scale('+transform.viewerZoom+')';
 };
 if(img.complete)draw();else img.addEventListener('load',draw,{once:true});
}
export function openImageTranslation(image){
 const sources=getImageTranslationSources();
 if(!sources.length){toast('Add a Google, DeepL, or LibreTranslate API source in Translation sources first');return}
 const options=sources.map(source=>'<option value="'+esc(source.id)+'">'+esc(source.name)+'</option>').join('');
 const body='<div class="stack"><p class="muted tiny">OCR runs in your browser. Detected text is sent to the selected translation provider and displayed over the original text. Translation target is always English.</p><label>Text language<select id="imageOcrLanguage"><option value="jpn">Japanese</option><option value="chi_sim">Chinese (Simplified)</option><option value="chi_tra">Chinese (Traditional)</option><option value="kor">Korean</option></select></label><label>Translation source<select id="imageTranslationSource">'+options+'</select></label><div id="imageTranslationProgress" class="muted tiny" aria-live="polite">Ready</div><div class="row"><span class="grow"></span><button type="button" id="startImageTranslation" class="primary">Detect & translate</button></div></div>';
 modal('Translate image',body,()=>{
  $('startImageTranslation').onclick=async()=>{
   const button=$('startImageTranslation'),progress=$('imageTranslationProgress'),language=$('imageOcrLanguage').value,sourceId=$('imageTranslationSource').value;
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
    let translatedLines=translated.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(translatedLines.length!==lines.length){const box={left:Math.min(...lines.map(line=>line.bbox.x0))/width,top:Math.min(...lines.map(line=>line.bbox.y0))/height,width:(Math.max(...lines.map(line=>line.bbox.x1))-Math.min(...lines.map(line=>line.bbox.x0)))/width,height:(Math.max(...lines.map(line=>line.bbox.y1))-Math.min(...lines.map(line=>line.bbox.y0)))/height,text:translated};overlays.set(image.id,[box]);closeModal();renderImageTranslationOverlay(image);toast('Image translated');return}
    const width=result.data.imageSize?.width||result.data.width||1,height=result.data.imageSize?.height||result.data.height||1;
    const next=lines.map((line,index)=>({left:line.bbox.x0/width,top:line.bbox.y0/height,width:(line.bbox.x1-line.bbox.x0)/width,height:(line.bbox.y1-line.bbox.y0)/height,text:translatedLines[index]||translated}));
    overlays.set(image.id,next);closeModal();renderImageTranslationOverlay(image);toast('Image translated · '+lines.length+' regions');
   }catch(error){progress.textContent=error.message||'Image translation failed';button.disabled=false}
  };
 });
}
