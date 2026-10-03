export type User={profession?:string;role:'admin'|'assessor';id:string;name:string;email:string;verified:boolean;createdAt:string};
export type Photo={id:string;name:string;type:string};
export type Area={id?:string;code:string;unit:string;type:string;name:string;sqm:number|null};
export type Capture={id?:string;area:string;section:string;element:string;component:string;type:string;exists:string;extent:number|null;extentUnit?:string;remedialCost?:number|null;remedialQuantity?:number|null;unitRate?:number|null;priority?:string;measuredScope?:string;workType?:string;maintenanceWork?:string;ratings:number[];comment:string;discipline:string;photos?:Photo[]};
export type Payload={areas:Area[];elements?:{area:string;name:string}[];captures:Capture[];pricing?:{pg:number;fees:number;contingency:number;vat:number}};
export type Project={companyName?:string;companyAddress?:string;clientAddress?:string;id:string;name:string;assetNumber:string;client:string;discipline:string;assessorName:string;assessorRole:string;assessorRegistration:string;updatedAt:number;version:number;payload:Payload;sitePlanName?:string;facilityLogoName?:string;companyLogoName?:string;assessorSignatureName?:string};
export type ProjectInput=Pick<Project,'name'|'assetNumber'|'client'|'discipline'|'payload'>&Partial<Pick<Project,'companyName'|'companyAddress'|'clientAddress'|'assessorName'|'assessorRole'|'assessorRegistration'|'version'>>;
export type AssetKind='site-plan'|'facility-logo'|'company-logo'|'assessor-signature'|'photo';
