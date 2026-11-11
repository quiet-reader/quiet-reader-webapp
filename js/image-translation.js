import {$,esc,toast,modal,closeModal} from './utils.js';
import {translateImageText,getImageTranslationSources} from './translation.js';

const overlays=new Map();
let worker=null,workerLanguage='';
export function clearImageTranslationOverlay(imageId){
 if(imageId)overlays.delete(imageId);else overlays.clear();
 const root=$('imageTranslationOverlay');if(root)root.replaceChildren();
}
export function renderImageTranslationOverlay(image){
 const root=$('imageTranslationOverlay');if(!root)return;
 const text=overlays.get(image?.id)||'';
 root.replaceChildren();
 if(!text)return;
 const panel=document.createElement('div');
 panel.className='image-translation-result';
 panel.setAttribute('role','status');
 panel.textContent=text;
 root.append(panel);
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
   const lines=(result.data.lines||[]).filter(line=>line.text?.trim()&&line.confidence>=15);
   if(!lines.length)throw new Error('No readable text detected. Try another language or a clearer image.');
   progress.textContent='Translating '+lines.length+' detected regions to English…';
   const joined=lines.map(line=>line.text.trim()).join('\n');
   const translated=await translateImageText(joined,sourceId);
   if(!translated.trim())throw new Error('The translation provider returned empty text. Try another source.');
   overlays.set(image.id,translated.trim());
   dismiss();renderImageTranslationOverlay(image);toast('Image translated · '+lines.length+' text lines');
  }catch(error){progress.textContent=error.message||'Image translation failed';button.disabled=false}
 };
}
