"use strict";
// CINEFLIX VIP — apenas funções no servidor. NÃO coloque PINs no site ou Firestore público.
// Uma integração de pagamento verificada, ainda não implementada, deverá criar
// vipSubscriptions/{uid} com status='active' e expiresAt=Timestamp.
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {initializeApp}=require("firebase-admin/app");
const {getFirestore,Timestamp}=require("firebase-admin/firestore");
const {scrypt,randomBytes,timingSafeEqual}=require("node:crypto");
const {promisify}=require("node:util");
initializeApp();
const db=getFirestore(), derive=promisify(scrypt);
const region="southamerica-east1";
const cfg={region,maxInstances:10};
function uidFor(req){if(!req.auth?.uid)throw new HttpsError("unauthenticated","Entre com sua conta Google.");return req.auth.uid;}
function validPin(pin){return typeof pin==="string" && /^[0-9]{8}$/.test(pin);}
async function activeSubscription(uid){
 const snap=await db.doc("vipSubscriptions/"+uid).get(),sub=snap.data();
 return Boolean(snap.exists&&sub.status==="active"&&sub.expiresAt?.toMillis?.()>Date.now());
}
async function hashPin(pin,salt){return (await derive(pin,Buffer.from(salt,"hex"),64)).toString("hex");}
async function checkPin(pin,salt,expected){
 const got=Buffer.from(await hashPin(pin,salt),"hex"),correct=Buffer.from(expected,"hex");
 return got.length===correct.length&&timingSafeEqual(got,correct);
}
exports.vipStatus=onCall(cfg,async req=>{
 const uid=uidFor(req);
 const [subscription,pin]=await Promise.all([db.doc("vipSubscriptions/"+uid).get(),db.doc("vipPinSecurity/"+uid).get()]);
 const sub=subscription.data();
 const active=Boolean(sub?.status==="active"&&sub?.expiresAt?.toMillis?.()>Date.now());
 return {active,expiresAt:active?sub.expiresAt.toMillis():null,pinConfigured:pin.exists};
});
exports.vipCreatePin=onCall(cfg,async req=>{
 const uid=uidFor(req),pin=req.data?.pin;
 if(!validPin(pin))throw new HttpsError("invalid-argument","Crie um PIN numérico com exatamente 8 dígitos.");
 if(!await activeSubscription(uid))throw new HttpsError("failed-precondition","A assinatura VIP ainda não está ativa.");
 const salt=randomBytes(32).toString("hex"),hash=await hashPin(pin,salt);
 const ref=db.doc("vipPinSecurity/"+uid);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(snap.exists)throw new HttpsError("already-exists","PIN já cadastrado. Para trocar, use recuperação verificada.");
  tx.create(ref,{salt,hash,attempts:0,lockedUntil:Timestamp.fromMillis(0),createdAt:Timestamp.now()});
 });
 return {success:true};
});
exports.vipVerifyPin=onCall(cfg,async req=>{
 const uid=uidFor(req),pin=req.data?.pin;
 if(!validPin(pin))throw new HttpsError("invalid-argument","Informe o PIN de 8 dígitos.");
 if(!await activeSubscription(uid))throw new HttpsError("failed-precondition","A assinatura VIP não está ativa.");
 const ref=db.doc("vipPinSecurity/"+uid);
 // A transação serializa as tentativas e persiste bloqueios contra adivinhação.
 return await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new HttpsError("failed-precondition","PIN ainda não cadastrado.");
  const data=snap.data();
  if(data.lockedUntil?.toMillis?.()>Date.now())throw new HttpsError("resource-exhausted","Muitas tentativas. Tente novamente mais tarde.");
  const valid=await checkPin(pin,data.salt,data.hash);
  if(valid){tx.update(ref,{attempts:0,lockedUntil:Timestamp.fromMillis(0)});return {verified:true};}
  const attempts=(data.attempts||0)+1;
  const lockedUntil=attempts>=5?Timestamp.fromMillis(Date.now()+15*60*1000):Timestamp.fromMillis(0);
  tx.update(ref,{attempts:attempts>=5?0:attempts,lockedUntil});
  return {verified:false,locked:attempts>=5};
 });
});
// A verificação do PIN não concede acesso por si só.
// Qualquer conteúdo VIP precisa consultar a assinatura no servidor.
// Recuperação do PIN exigirá reautenticação forte, em implementação futura.
