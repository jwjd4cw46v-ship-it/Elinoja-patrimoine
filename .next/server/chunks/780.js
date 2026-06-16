"use strict";exports.id=780,exports.ids=[780],exports.modules={9015:(t,e,r)=>{r.d(e,{Z:()=>a});/**
 * @license lucide-react v0.408.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(62881).Z)("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]])},81466:(t,e,r)=>{r.d(e,{Z:()=>a});/**
 * @license lucide-react v0.408.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(62881).Z)("Pin",[["path",{d:"M12 17v5",key:"bb1du9"}],["path",{d:"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",key:"1nkz8b"}]])},91438:(t,e,r)=>{r.d(e,{Z:()=>a});/**
 * @license lucide-react v0.408.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(62881).Z)("Reply",[["polyline",{points:"9 17 4 12 9 7",key:"hvgpf2"}],["path",{d:"M20 18v-2a4 4 0 0 0-4-4H4",key:"5vmcpk"}]])},88307:(t,e,r)=>{r.d(e,{Z:()=>a});/**
 * @license lucide-react v0.408.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(62881).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},94019:(t,e,r)=>{r.d(e,{Z:()=>a});/**
 * @license lucide-react v0.408.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(62881).Z)("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]])},43686:(t,e,r)=>{r.d(e,{Q:()=>l});var a=r(99276),n=r(71271);function s(t,e){let r=(0,n.Q)(t),a=(0,n.Q)(e),s=r.getTime()-a.getTime();return s<0?-1:s>0?1:s}var i=r(79740),o=r(73280),u=r(61981),f=r(78349);function l(t,e){return function(t,e,r){var a,l,c,h;let d,m,M;let D=(0,u.j)(),y=r?.locale??D.locale??o._,Q=s(t,e);if(isNaN(Q))throw RangeError("Invalid time value");let p=Object.assign({},r,{addSuffix:r?.addSuffix,comparison:Q});Q>0?(d=(0,n.Q)(e),m=(0,n.Q)(t)):(d=(0,n.Q)(t),m=(0,n.Q)(e));let g=(a=m,l=d,(h=void 0,t=>{let e=(h?Math[h]:Math.trunc)(t);return 0===e?0:e})((+(0,n.Q)(a)-+(0,n.Q)(l))/1e3)),v=Math.round((g-((0,f.D)(m)-(0,f.D)(d))/1e3)/60);if(v<2){if(r?.includeSeconds){if(g<5)return y.formatDistance("lessThanXSeconds",5,p);if(g<10)return y.formatDistance("lessThanXSeconds",10,p);if(g<20)return y.formatDistance("lessThanXSeconds",20,p);if(g<40)return y.formatDistance("halfAMinute",0,p);else if(g<60)return y.formatDistance("lessThanXMinutes",1,p);else return y.formatDistance("xMinutes",1,p)}return 0===v?y.formatDistance("lessThanXMinutes",1,p):y.formatDistance("xMinutes",v,p)}if(v<45)return y.formatDistance("xMinutes",v,p);if(v<90)return y.formatDistance("aboutXHours",1,p);if(v<i.H_)return y.formatDistance("aboutXHours",Math.round(v/60),p);if(v<2520)return y.formatDistance("xDays",1,p);if(v<i.fH){let t=Math.round(v/i.H_);return y.formatDistance("xDays",t,p)}if(v<2*i.fH)return M=Math.round(v/i.fH),y.formatDistance("aboutXMonths",M,p);if((M=function(t,e){let r;let a=(0,n.Q)(t),i=(0,n.Q)(e),o=s(a,i),u=Math.abs(function(t,e){let r=(0,n.Q)(t),a=(0,n.Q)(e);return 12*(r.getFullYear()-a.getFullYear())+(r.getMonth()-a.getMonth())}(a,i));if(u<1)r=0;else{1===a.getMonth()&&a.getDate()>27&&a.setDate(30),a.setMonth(a.getMonth()-o*u);let e=s(a,i)===-o;(function(t){let e=(0,n.Q)(t);return+function(t){let e=(0,n.Q)(t);return e.setHours(23,59,59,999),e}(e)==+function(t){let e=(0,n.Q)(t),r=e.getMonth();return e.setFullYear(e.getFullYear(),r+1,0),e.setHours(23,59,59,999),e}(e)})((0,n.Q)(t))&&1===u&&1===s(t,i)&&(e=!1),r=o*(u-Number(e))}return 0===r?0:r}(m,d))<12){let t=Math.round(v/i.fH);return y.formatDistance("xMonths",t,p)}{let t=M%12,e=Math.trunc(M/12);return t<3?y.formatDistance("aboutXYears",e,p):t<9?y.formatDistance("overXYears",e,p):y.formatDistance("almostXYears",e+1,p)}}(t,(0,a.L)(t,Date.now()),e)}}};