export class DiplomacyEngine {
  treaty(a:string,b:string,type:string){
    return { a, b, type, signedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}