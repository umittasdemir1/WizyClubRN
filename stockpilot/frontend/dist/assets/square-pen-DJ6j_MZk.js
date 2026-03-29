import{r as n,j as w}from"./index-BSm1N-RY.js";import{M as D,i as L,u as H,P as F,a as A,b as K,L as U}from"./proxy-CLHedxfM.js";import{c as E}from"./BrandSignature-D9rNYqyc.js";function I(e,r){if(typeof e=="function")return e(r);e!=null&&(e.current=r)}function W(...e){return r=>{let t=!1;const o=e.map(u=>{const c=I(u,r);return!t&&typeof c=="function"&&(t=!0),c});if(t)return()=>{for(let u=0;u<o.length;u++){const c=o[u];typeof c=="function"?c():I(e[u],null)}}}}function B(...e){return n.useCallback(W(...e),e)}class G extends n.Component{getSnapshotBeforeUpdate(r){const t=this.props.childRef.current;if(L(t)&&r.isPresent&&!this.props.isPresent&&this.props.pop!==!1){const o=t.offsetParent,u=L(o)&&o.offsetWidth||0,c=L(o)&&o.offsetHeight||0,f=getComputedStyle(t),s=this.props.sizeRef.current;s.height=parseFloat(f.height),s.width=parseFloat(f.width),s.top=t.offsetTop,s.left=t.offsetLeft,s.right=u-s.width-s.left,s.bottom=c-s.height-s.top}return null}componentDidUpdate(){}render(){return this.props.children}}function T({children:e,isPresent:r,anchorX:t,anchorY:o,root:u,pop:c}){var a;const f=n.useId(),s=n.useRef(null),M=n.useRef({width:0,height:0,top:0,left:0,right:0,bottom:0}),{nonce:R}=n.useContext(D),l=((a=e.props)==null?void 0:a.ref)??(e==null?void 0:e.ref),x=B(s,l);return n.useInsertionEffect(()=>{const{width:p,height:h,top:y,left:g,right:P,bottom:_}=M.current;if(r||c===!1||!s.current||!p||!h)return;const b=t==="left"?`left: ${g}`:`right: ${P}`,m=o==="bottom"?`bottom: ${_}`:`top: ${y}`;s.current.dataset.motionPopId=f;const C=document.createElement("style");R&&(C.nonce=R);const k=u??document.head;return k.appendChild(C),C.sheet&&C.sheet.insertRule(`
          [data-motion-pop-id="${f}"] {
            position: absolute !important;
            width: ${p}px !important;
            height: ${h}px !important;
            ${b}px !important;
            ${m}px !important;
          }
        `),()=>{k.contains(C)&&k.removeChild(C)}},[r]),w.jsx(G,{isPresent:r,childRef:s,sizeRef:M,pop:c,children:c===!1?e:n.cloneElement(e,{ref:x})})}const V=({children:e,initial:r,isPresent:t,onExitComplete:o,custom:u,presenceAffectsLayout:c,mode:f,anchorX:s,anchorY:M,root:R})=>{const l=H(X),x=n.useId();let a=!0,p=n.useMemo(()=>(a=!1,{id:x,initial:r,isPresent:t,custom:u,onExitComplete:h=>{l.set(h,!0);for(const y of l.values())if(!y)return;o&&o()},register:h=>(l.set(h,!1),()=>l.delete(h))}),[t,l,o]);return c&&a&&(p={...p}),n.useMemo(()=>{l.forEach((h,y)=>l.set(y,!1))},[t]),n.useEffect(()=>{!t&&!l.size&&o&&o()},[t]),e=w.jsx(T,{pop:f==="popLayout",isPresent:t,anchorX:s,anchorY:M,root:R,children:e}),w.jsx(F.Provider,{value:p,children:e})};function X(){return new Map}const $=e=>e.key||"";function N(e){const r=[];return n.Children.forEach(e,t=>{n.isValidElement(t)&&r.push(t)}),r}const se=({children:e,custom:r,initial:t=!0,onExitComplete:o,presenceAffectsLayout:u=!0,mode:c="sync",propagate:f=!1,anchorX:s="left",anchorY:M="top",root:R})=>{const[l,x]=A(f),a=n.useMemo(()=>N(e),[e]),p=f&&!l?[]:a.map($),h=n.useRef(!0),y=n.useRef(a),g=H(()=>new Map),P=n.useRef(new Set),[_,b]=n.useState(a),[m,C]=n.useState(a);K(()=>{h.current=!1,y.current=a;for(let d=0;d<m.length;d++){const i=$(m[d]);p.includes(i)?(g.delete(i),P.current.delete(i)):g.get(i)!==!0&&g.set(i,!1)}},[m,p.length,p.join("-")]);const k=[];if(a!==_){let d=[...a];for(let i=0;i<m.length;i++){const v=m[i],S=$(v);p.includes(S)||(d.splice(i,0,v),k.push(v))}return c==="wait"&&k.length&&(d=k),C(N(d)),b(a),null}const{forceRender:j}=n.useContext(U);return w.jsx(w.Fragment,{children:m.map(d=>{const i=$(d),v=f&&!l?!1:a===m||p.includes(i),S=()=>{if(P.current.has(i))return;if(P.current.add(i),g.has(i))g.set(i,!0);else return;let z=!0;g.forEach(q=>{q||(z=!1)}),z&&(j==null||j(),C(y.current),f&&(x==null||x()),o&&o())};return w.jsx(V,{isPresent:v,initial:!h.current||t?void 0:!1,custom:r,presenceAffectsLayout:u,mode:c,root:R,onExitComplete:v?void 0:S,anchorX:s,anchorY:M,children:d},i)})})};/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],oe=E("calendar",Y);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],re=E("check",J);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],ie=E("chevron-down",O);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],ce=E("plus",Q);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]],ae=E("square-pen",Z);export{se as A,ie as C,ce as P,ae as S,re as a,oe as b};
