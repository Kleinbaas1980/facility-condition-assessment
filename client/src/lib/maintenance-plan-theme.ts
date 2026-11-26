type RGB=[number,number,number];
export function maintenanceRowTheme(label:string,strong=false):{name:string;fill:RGB;ink:RGB;accent:RGB}{
 if(label==='Opex')return {name:'plan-opex',fill:[232,246,239],ink:[21,85,60],accent:[30,130,88]};
 if(label==='Capex')return {name:'plan-capex',fill:[232,240,252],ink:[30,67,117],accent:[48,104,180]};
 if(label==='Review classification')return {name:'plan-review',fill:[255,245,219],ink:[111,76,12],accent:[203,145,22]};
 if(label==='Total maintenance budget')return {name:'plan-grand',fill:[181,69,14],ink:[255,255,255],accent:[242,103,34]};
 if(strong)return {name:'plan-subtotal',fill:[230,234,238],ink:[45,55,65],accent:[77,77,77]};
 return {name:'plan-allowance',fill:[248,249,251],ink:[66,75,84],accent:[188,197,207]};
}
