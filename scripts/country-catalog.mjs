import {readFile,writeFile} from 'node:fs/promises';
const geo=JSON.parse(await readFile('apps/web/public/countries.geojson','utf8'));
const countries=geo.features.map(feature=>{
 const p=feature.properties,code=p.ISO_A2_EH;
 if(!/^[A-Z]{2}$/.test(code))return null;
 const points=feature.geometry.coordinates.flat(feature.geometry.type==='MultiPolygon'?2:1);
 const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
 return {code,name:p.NAME_EN,nameDe:p.NAME_DE,continent:p.CONTINENT,bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],aliases:[p.NAME_EN,p.NAME_DE,p.NAME_FR,p.NAME_IT,p.NAME_ES].filter(Boolean)};
}).filter(Boolean);
await writeFile('packages/shared/countries.json',JSON.stringify(countries,null,2)+'\n');
console.log('Prepared country metadata:',countries.length);
