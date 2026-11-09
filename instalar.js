(()=>{
let pending=null;const button=document.getElementById('installApp'),dialog=document.getElementById('installHelp');
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function refresh(){button.hidden=standalone();}refresh();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;refresh()});
window.addEventListener('appinstalled',()=>{pending=null;button.hidden=true});
button.addEventListener('click',async()=>{if(pending){const prompt=pending;pending=null;try{await prompt.prompt();await prompt.userChoice}catch{}return;}
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
document.getElementById('installInstructions').textContent=ios?'No Safari, toque em Compartilhar (quadrado com seta para cima), escolha “Adicionar à Tela de Início” e confirme em “Adicionar”. Se aparecer “Abrir como App da Web”, deixe ativado.':/Android/.test(navigator.userAgent)?'Abra este site no Chrome. Toque no menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Se a opção não aparecer, atualize a página e tente novamente.':'Abra o menu do navegador e procure a opção de instalar este site como aplicativo. No celular, use o Chrome no Android ou o Safari no iPhone.';
dialog.showModal()});
document.getElementById('closeInstallHelp').onclick=()=>dialog.close();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{}));
})();