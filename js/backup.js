import {state} from './state.js';import {getAll,put} from './db.js';import {applyTheme} from './themes.js';import {download,toast,modal,closeModal,esc} from './utils.js';
export async function exportBackup(){
 const items=await getAll(),books=items.filter(item=>item.kind==='book'),pastes=items.filter(item=>item.kind==='paste');
 const defaultChecked={novels:true,marks:true,progress:true,pastes:true,appearance:true};
 modal('Create backup','<div class="stack"><p class="muted tiny">Choose what to include in your local backup. Nothing downloads until you confirm.</p><label class="backup-option"><input type="checkbox" id="backupNovels" checked> Novels and chapters (including covers, tags and notes)</label><label class="backup-option"><input type="checkbox" id="backupMarks" checked> Bookmarks and highlights</label><label class="backup-option"><input type="checkbox" id="backupProgress" checked> Reading progress</label><label class="backup-option"><input type="checkbox" id="backupPastes" checked> Saved pasted chapters</label><label class="backup-option"><input type="checkbox" id="backupAppearance" checked> Appearance and reader preferences</label><div class="row"><span class="grow"></span><button id="cancelBackup">Cancel</button><button id="confirmBackup" class="primary">Confirm backup</button></div></div>',()=>{
  $('cancelBackup').onclick=closeModal;
  $('confirmBackup').onclick=()=>{
   const selected={novels:$('backupNovels').checked,marks:$('backupMarks').checked,progress:$('backupProgress').checked,pastes:$('backupPastes').checked,appearance:$('backupAppearance').checked};
   if(!Object.values(selected).some(Boolean))return toast('Select at least one backup category');
   const chosen=[];
   if(selected.novels)for(const book of books){const copy=structuredClone(book);if(!selected.marks){delete copy.bookmarks;delete copy.highlights}if(!selected.progress)delete copy.progress;chosen.push(copy)}
   if(selected.pastes)chosen.push(...pastes.map(p=>structuredClone(p)));
   const payload={format:'QuietBookBackup',version:3,items:chosen,sections:selected,theme:selected.appearance?(localStorage.getItem('qbtheme')||'default'):undefined,preferences:selected.appearance?{tagColors:localStorage.getItem('qrTagColors'),libraryView:localStorage.getItem('qrLibraryView'),librarySort:localStorage.getItem('qrLibrarySort'),autoReadHighlight:localStorage.getItem('qrAutoReadHighlight')}:undefined,created:Date.now()};
   download(new Blob([JSON.stringify(payload)],{type:'application/json'}),'quiet-reader-backup.json');closeModal();toast('Backup exported')
  }
 })
}
export async function importBackup(file){try{const d=JSON.parse(await file.text());if(d.format!=='QuietBookBackup')throw Error('This is not a QuietBook backup');const items=d.items||[...(d.books||[]),...(d.pastes||[])];for(const item of items)await put(item);if(d.theme)applyTheme(d.theme);if(d.preferences){for(const [key,value] of Object.entries({qrTagColors:d.preferences.tagColors,qrLibraryView:d.preferences.libraryView,qrLibrarySort:d.preferences.librarySort,qrAutoReadHighlight:d.preferences.autoReadHighlight})){if(value!==undefined&&value!==null)localStorage.setItem(key,value)}}toast('Backup imported');location.reload()}catch(e){alert('Could not import backup: '+e.message)}}