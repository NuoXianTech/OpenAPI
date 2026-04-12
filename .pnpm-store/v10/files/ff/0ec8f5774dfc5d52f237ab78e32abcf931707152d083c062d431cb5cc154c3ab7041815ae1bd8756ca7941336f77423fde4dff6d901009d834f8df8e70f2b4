(function(e,t){typeof exports==`object`&&typeof module<`u`?module.exports=t(require(`vue`)):typeof define==`function`&&define.amd?define([`vue`],t):(e=typeof globalThis<`u`?globalThis:e||self,e.VueSonner=t(e.Vue))})(this,function(e){var t=Object.create,n=Object.defineProperty,r=Object.getOwnPropertyDescriptor,i=Object.getOwnPropertyNames,a=Object.getPrototypeOf,o=Object.prototype.hasOwnProperty,s=(e,t,a,s)=>{if(t&&typeof t==`object`||typeof t==`function`)for(var c=i(t),l=0,u=c.length,d;l<u;l++)d=c[l],!o.call(e,d)&&d!==a&&n(e,d,{get:(e=>t[e]).bind(null,d),enumerable:!(s=r(t,d))||s.enumerable});return e},c=(e,r,i)=>(i=e==null?{}:t(a(e)),s(r||!e||!e.__esModule?n(i,`default`,{value:e,enumerable:!0}):i,e));e=c(e);let l=1;var u=class{subscribers;toasts;dismissedToasts;constructor(){this.subscribers=[],this.toasts=[],this.dismissedToasts=new Set}subscribe=e=>(this.subscribers.push(e),()=>{let t=this.subscribers.indexOf(e);this.subscribers.splice(t,1)});publish=e=>{this.subscribers.forEach(t=>t(e))};addToast=e=>{this.publish(e),this.toasts=[...this.toasts,e]};create=e=>{let{message:t,...n}=e,r=typeof e.id==`number`||e.id&&e.id?.length>0?e.id:l++,i=this.toasts.find(e=>e.id===r),a=e.dismissible===void 0?!0:e.dismissible;return this.dismissedToasts.has(r)&&this.dismissedToasts.delete(r),i?this.toasts=this.toasts.map(n=>n.id===r?(this.publish({...n,...e,id:r,title:t}),{...n,...e,id:r,dismissible:a,title:t}):n):this.addToast({title:t,...n,dismissible:a,id:r}),r};dismiss=e=>(e?(this.dismissedToasts.add(e),requestAnimationFrame(()=>this.subscribers.forEach(t=>t({id:e,dismiss:!0})))):this.toasts.forEach(e=>{this.subscribers.forEach(t=>t({id:e.id,dismiss:!0}))}),e);message=(e,t)=>this.create({...t,message:e,type:`default`});error=(e,t)=>this.create({...t,type:`error`,message:e});success=(e,t)=>this.create({...t,type:`success`,message:e});info=(e,t)=>this.create({...t,type:`info`,message:e});warning=(e,t)=>this.create({...t,type:`warning`,message:e});loading=(e,t)=>this.create({...t,type:`loading`,message:e});promise=(t,n)=>{if(!n)return;let r;n.loading!==void 0&&(r=this.create({...n,promise:t,type:`loading`,message:n.loading,description:typeof n.description==`function`?void 0:n.description}));let i=Promise.resolve(t instanceof Function?t():t),a=r!==void 0,o,s=i.then(async t=>{o=[`resolve`,t];let i=(0,e.isVNode)(t);if(i)a=!1,this.create({id:r,type:`default`,message:t});else if(p(t)&&!t.ok){a=!1;let i=typeof n.error==`function`?await n.error(`HTTP error! status: ${t.status}`):n.error,o=typeof n.description==`function`?await n.description(`HTTP error! status: ${t.status}`):n.description,s=typeof i==`object`&&!(0,e.isVNode)(i),c=s?i:{message:i||``,id:r||``};this.create({id:r,type:`error`,description:o,...c})}else if(t instanceof Error){a=!1;let i=typeof n.error==`function`?await n.error(t):n.error,o=typeof n.description==`function`?await n.description(t):n.description,s=typeof i==`object`&&!(0,e.isVNode)(i),c=s?i:{message:i||``,id:r||``};this.create({id:r,type:`error`,description:o,...c})}else if(n.success!==void 0){a=!1;let i=typeof n.success==`function`?await n.success(t):n.success,o=typeof n.description==`function`?await n.description(t):n.description,s=typeof i==`object`&&!(0,e.isVNode)(i),c=s?i:{message:i||``,id:r||``};this.create({id:r,type:`success`,description:o,...c})}}).catch(async t=>{if(o=[`reject`,t],n.error!==void 0){a=!1;let i=typeof n.error==`function`?await n.error(t):n.error,o=typeof n.description==`function`?await n.description(t):n.description,s=typeof i==`object`&&!(0,e.isVNode)(i),c=s?i:{message:i||``,id:r||``};this.create({id:r,type:`error`,description:o,...c})}}).finally(()=>{a&&(this.dismiss(r),r=void 0),n.finally?.()}),c=()=>new Promise((e,t)=>s.then(()=>o[0]===`reject`?t(o[1]):e(o[1])).catch(t));return typeof r!=`string`&&typeof r!=`number`?{unwrap:c}:Object.assign(r,{unwrap:c})};custom=(e,t)=>{let n=t?.id||l++,r=this.toasts.find(e=>e.id===n),i=t?.dismissible===void 0?!0:t.dismissible;return this.dismissedToasts.has(n)&&this.dismissedToasts.delete(n),r?this.toasts=this.toasts.map(r=>r.id===n?(this.publish({...r,component:e,dismissible:i,id:n,...t}),{...r,component:e,dismissible:i,id:n,...t}):r):this.addToast({component:e,dismissible:i,id:n,...t}),n};getActiveToasts=()=>this.toasts.filter(e=>!this.dismissedToasts.has(e.id))};let d=new u;function f(e,t){let n=t?.id||l++;return d.create({message:e,id:n,type:`default`,...t}),n}let p=e=>e&&typeof e==`object`&&`ok`in e&&typeof e.ok==`boolean`&&`status`in e&&typeof e.status==`number`,m=f,h=()=>d.toasts,g=()=>d.getActiveToasts(),_=Object.assign(m,{success:d.success,info:d.info,warning:d.warning,error:d.error,custom:d.custom,message:d.message,promise:d.promise,dismiss:d.dismiss,loading:d.loading},{getHistory:h,getToasts:g});function v(e){return e.label!==void 0}let y=3,b=`24px`,x=`16px`,S=4e3,C=356,w=14,T=45,E=200;function D(){let t=(0,e.ref)(!1);return(0,e.watchEffect)(()=>{let e=()=>{t.value=document.hidden};return document.addEventListener(`visibilitychange`,e),()=>window.removeEventListener(`visibilitychange`,e)}),{isDocumentHidden:t}}function O(...e){return e.filter(Boolean).join(` `)}function k(e){let[t,n]=e.split(`-`),r=[];return t&&r.push(t),n&&r.push(n),r}function A(e,t){let n={};return[e,t].forEach((e,t)=>{let r=t===1,i=r?`--mobile-offset`:`--offset`,a=r?x:b;function o(e){[`top`,`right`,`bottom`,`left`].forEach(t=>{n[`${i}-${t}`]=typeof e==`number`?`${e}px`:e})}typeof e==`number`||typeof e==`string`?o(e):typeof e==`object`?[`top`,`right`,`bottom`,`left`].forEach(t=>{e[t]===void 0?n[`${i}-${t}`]=a:n[`${i}-${t}`]=typeof e[t]==`number`?`${e[t]}px`:e[t]}):o(a)}),n}let j=[`data-rich-colors`,`data-styled`,`data-mounted`,`data-promise`,`data-swiped`,`data-removed`,`data-visible`,`data-y-position`,`data-x-position`,`data-index`,`data-front`,`data-swiping`,`data-dismissible`,`data-type`,`data-invert`,`data-swipe-out`,`data-swipe-direction`,`data-expanded`,`data-testid`],M=[`aria-label`,`data-disabled`,`data-close-button-position`];var N=(0,e.defineComponent)({__name:`Toast`,props:{toast:{},toasts:{},index:{},swipeDirections:{},expanded:{type:Boolean},invert:{type:Boolean},heights:{},gap:{},position:{},closeButtonPosition:{},visibleToasts:{},expandByDefault:{type:Boolean},closeButton:{type:Boolean},interacting:{type:Boolean},style:{},cancelButtonStyle:{},actionButtonStyle:{},duration:{},class:{},unstyled:{type:Boolean},descriptionClass:{},loadingIcon:{},classes:{},icons:{},closeButtonAriaLabel:{},defaultRichColors:{type:Boolean}},emits:[`update:heights`,`update:height`,`removeToast`],setup(t,{emit:n}){let r=t,i=n,a=(0,e.ref)(null),o=(0,e.ref)(null),s=(0,e.ref)(!1),c=(0,e.ref)(!1),l=(0,e.ref)(!1),u=(0,e.ref)(!1),d=(0,e.ref)(!1),f=(0,e.ref)(0),p=(0,e.ref)(0),m=(0,e.ref)(r.toast.duration||r.duration||S),h=(0,e.ref)(null),g=(0,e.ref)(null),_=(0,e.computed)(()=>r.index===0),y=(0,e.computed)(()=>r.index+1<=r.visibleToasts),b=(0,e.computed)(()=>r.toast.type),x=(0,e.computed)(()=>r.toast.dismissible!==!1),C=(0,e.computed)(()=>r.toast.class||``),w=(0,e.computed)(()=>r.descriptionClass||``),A=(0,e.computed)(()=>{let e=r.toast.position||r.position,t=r.heights.filter(t=>t.position===e),n=t.findIndex(e=>e.toastId===r.toast.id);return n>=0?n:0}),N=(0,e.computed)(()=>{let e=r.toast.position||r.position,t=r.heights.filter(t=>t.position===e);return t.reduce((e,t,n)=>n>=A.value?e:e+t.height,0)}),P=(0,e.computed)(()=>A.value*r.gap+N.value||0),F=(0,e.computed)(()=>r.toast.closeButton??r.closeButton),I=(0,e.computed)(()=>r.toast.duration||r.duration||S),L=(0,e.ref)(0),R=(0,e.ref)(0),z=(0,e.ref)(null),B=(0,e.computed)(()=>r.position.split(`-`)),V=(0,e.computed)(()=>B.value[0]),H=(0,e.computed)(()=>B.value[1]),U=(0,e.computed)(()=>typeof r.toast.title!=`string`),W=(0,e.computed)(()=>typeof r.toast.description!=`string`),{isDocumentHidden:G}=D(),K=(0,e.computed)(()=>b.value&&b.value===`loading`);(0,e.onMounted)(()=>{s.value=!0,m.value=I.value}),(0,e.watchEffect)(async()=>{if(!s.value||!g.value)return;await(0,e.nextTick)();let t=g.value,n=t.style.height;t.style.height=`auto`;let a=t.getBoundingClientRect().height;t.style.height=n,p.value=a,i(`update:height`,{toastId:r.toast.id,height:a,position:r.toast.position||r.position})});function q(){c.value=!0,f.value=P.value,setTimeout(()=>{i(`removeToast`,r.toast)},E)}function J(){if(K.value||!x.value)return{};q(),r.toast.onDismiss?.(r.toast)}function Y(e){e.button!==2&&(K.value||!x.value||(h.value=new Date,f.value=P.value,e.target.setPointerCapture(e.pointerId),e.target.tagName!==`BUTTON`&&(l.value=!0,z.value={x:e.clientX,y:e.clientY})))}function X(){if(u.value||!x.value)return;z.value=null;let e=Number(g.value?.style.getPropertyValue(`--swipe-amount-x`).replace(`px`,``)||0),t=Number(g.value?.style.getPropertyValue(`--swipe-amount-y`).replace(`px`,``)||0),n=new Date().getTime()-(h.value?.getTime()||0),i=a.value===`x`?e:t,s=Math.abs(i)/n;if(Math.abs(i)>=T||s>.11){f.value=P.value,r.toast.onDismiss?.(r.toast),a.value===`x`?o.value=e>0?`right`:`left`:o.value=t>0?`down`:`up`,q(),u.value=!0;return}else g.value?.style.setProperty(`--swipe-amount-x`,`0px`),g.value?.style.setProperty(`--swipe-amount-y`,`0px`);d.value=!1,l.value=!1,a.value=null}function Z(e){if(!z.value||!x.value)return;let t=window?.getSelection()?.toString()?.length??!1;if(t)return;let n=e.clientY-z.value.y,i=e.clientX-z.value.x,o=r.swipeDirections??k(r.position);!a.value&&(Math.abs(i)>1||Math.abs(n)>1)&&(a.value=Math.abs(i)>Math.abs(n)?`x`:`y`);let s={x:0,y:0},c=e=>{let t=Math.abs(e)/20;return 1/(1.5+t)};if(a.value===`y`){if(o.includes(`top`)||o.includes(`bottom`))if(o.includes(`top`)&&n<0||o.includes(`bottom`)&&n>0)s.y=n;else{let e=n*c(n);s.y=Math.abs(e)<Math.abs(n)?e:n}}else if(a.value===`x`&&(o.includes(`left`)||o.includes(`right`)))if(o.includes(`left`)&&i<0||o.includes(`right`)&&i>0)s.x=i;else{let e=i*c(i);s.x=Math.abs(e)<Math.abs(i)?e:i}(Math.abs(s.x)>0||Math.abs(s.y)>0)&&(d.value=!0),g.value?.style.setProperty(`--swipe-amount-x`,`${s.x}px`),g.value?.style.setProperty(`--swipe-amount-y`,`${s.y}px`)}(0,e.onMounted)(()=>{if(s.value=!0,!g.value)return;let e=g.value.getBoundingClientRect().height;p.value=e;let t=[{toastId:r.toast.id,height:e,position:r.toast.position},...r.heights];i(`update:heights`,t)}),(0,e.onBeforeUnmount)(()=>{g.value&&i(`removeToast`,r.toast)}),(0,e.watchEffect)(e=>{if(r.toast.promise&&b.value===`loading`||r.toast.duration===1/0||r.toast.type===`loading`)return;let t,n=()=>{if(R.value<L.value){let e=new Date().getTime()-L.value;m.value-=e}R.value=new Date().getTime()},i=()=>{m.value!==1/0&&(L.value=new Date().getTime(),t=setTimeout(()=>{r.toast.onAutoClose?.(r.toast),q()},m.value))};r.expanded||r.interacting||G.value?n():i(),e(()=>{clearTimeout(t)})}),(0,e.watch)(()=>r.toast.delete,e=>{e!==void 0&&e&&(q(),r.toast.onDismiss?.(r.toast))},{deep:!0});function Q(){l.value=!1,a.value=null,z.value=null}return(t,n)=>((0,e.openBlock)(),(0,e.createElementBlock)(`li`,{tabindex:`0`,ref_key:`toastRef`,ref:g,class:(0,e.normalizeClass)((0,e.unref)(O)(r.class,C.value,t.classes?.toast,t.toast.classes?.toast,t.classes?.[b.value],t.toast?.classes?.[b.value])),"data-sonner-toast":``,"data-rich-colors":t.toast.richColors??t.defaultRichColors,"data-styled":!(t.toast.component||t.toast?.unstyled||t.unstyled),"data-mounted":s.value,"data-promise":!!t.toast.promise,"data-swiped":d.value,"data-removed":c.value,"data-visible":y.value,"data-y-position":V.value,"data-x-position":H.value,"data-index":t.index,"data-front":_.value,"data-swiping":l.value,"data-dismissible":x.value,"data-type":b.value,"data-invert":t.toast.invert||t.invert,"data-swipe-out":u.value,"data-swipe-direction":o.value,"data-expanded":!!(t.expanded||t.expandByDefault&&s.value),"data-testid":t.toast.testId,style:(0,e.normalizeStyle)({"--index":t.index,"--toasts-before":t.index,"--z-index":t.toasts.length-t.index,"--offset":`${c.value?f.value:P.value}px`,"--initial-height":t.expandByDefault?`auto`:`${p.value}px`,...t.style,...r.toast.style}),onDragend:Q,onPointerdown:Y,onPointerup:X,onPointermove:Z},[F.value&&!t.toast.component&&b.value!==`loading`?((0,e.openBlock)(),(0,e.createElementBlock)(`button`,{key:0,"aria-label":t.closeButtonAriaLabel||`Close toast`,"data-disabled":K.value,"data-close-button":`true`,"data-close-button-position":t.closeButtonPosition,class:(0,e.normalizeClass)((0,e.unref)(O)(t.classes?.closeButton,t.toast?.classes?.closeButton)),onClick:J},[t.icons?.close?((0,e.openBlock)(),(0,e.createBlock)((0,e.resolveDynamicComponent)(t.icons?.close),{key:0})):(0,e.renderSlot)(t.$slots,`close-icon`,{key:1})],10,M)):(0,e.createCommentVNode)(`v-if`,!0),t.toast.component?((0,e.openBlock)(),(0,e.createBlock)((0,e.resolveDynamicComponent)(t.toast.component),(0,e.mergeProps)({key:1},t.toast.componentProps,{onCloseToast:J,isPaused:t.$props.expanded||t.$props.interacting||(0,e.unref)(G)}),null,16,[`isPaused`])):((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:2},[b.value!==`default`||t.toast.icon||t.toast.promise?((0,e.openBlock)(),(0,e.createElementBlock)(`div`,{key:0,"data-icon":``,class:(0,e.normalizeClass)((0,e.unref)(O)(t.classes?.icon,t.toast?.classes?.icon))},[t.toast.icon?((0,e.openBlock)(),(0,e.createBlock)((0,e.resolveDynamicComponent)(t.toast.icon),{key:0})):((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:1},[b.value===`loading`?(0,e.renderSlot)(t.$slots,`loading-icon`,{key:0}):b.value===`success`?(0,e.renderSlot)(t.$slots,`success-icon`,{key:1}):b.value===`error`?(0,e.renderSlot)(t.$slots,`error-icon`,{key:2}):b.value===`warning`?(0,e.renderSlot)(t.$slots,`warning-icon`,{key:3}):b.value===`info`?(0,e.renderSlot)(t.$slots,`info-icon`,{key:4}):(0,e.createCommentVNode)(`v-if`,!0)],64))],2)):(0,e.createCommentVNode)(`v-if`,!0),(0,e.createElementVNode)(`div`,{"data-content":``,class:(0,e.normalizeClass)((0,e.unref)(O)(t.classes?.content,t.toast?.classes?.content))},[(0,e.createElementVNode)(`div`,{"data-title":``,class:(0,e.normalizeClass)((0,e.unref)(O)(t.classes?.title,t.toast.classes?.title))},[U.value?((0,e.openBlock)(),(0,e.createBlock)((0,e.resolveDynamicComponent)(t.toast.title),(0,e.normalizeProps)((0,e.mergeProps)({key:0},t.toast.componentProps)),null,16)):((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:1},[(0,e.createTextVNode)((0,e.toDisplayString)(t.toast.title),1)],64))],2),t.toast.description?((0,e.openBlock)(),(0,e.createElementBlock)(`div`,{key:0,"data-description":``,class:(0,e.normalizeClass)((0,e.unref)(O)(t.descriptionClass,w.value,t.classes?.description,t.toast.classes?.description))},[W.value?((0,e.openBlock)(),(0,e.createBlock)((0,e.resolveDynamicComponent)(t.toast.description),(0,e.normalizeProps)((0,e.mergeProps)({key:0},t.toast.componentProps)),null,16)):((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:1},[(0,e.createTextVNode)((0,e.toDisplayString)(t.toast.description),1)],64))],2)):(0,e.createCommentVNode)(`v-if`,!0)],2),t.toast.cancel?((0,e.openBlock)(),(0,e.createElementBlock)(`button`,{key:1,style:(0,e.normalizeStyle)(t.toast.cancelButtonStyle||t.cancelButtonStyle),class:(0,e.normalizeClass)((0,e.unref)(O)(t.classes?.cancelButton,t.toast.classes?.cancelButton)),"data-button":``,"data-cancel":``,onClick:n[0]||=n=>{(0,e.unref)(v)(t.toast.cancel)&&x.value&&(t.toast.cancel.onClick?.(n),q())}},(0,e.toDisplayString)((0,e.unref)(v)(t.toast.cancel)?t.toast.cancel?.label:t.toast.cancel),7)):(0,e.createCommentVNode)(`v-if`,!0),t.toast.action?((0,e.openBlock)(),(0,e.createElementBlock)(`button`,{key:2,style:(0,e.normalizeStyle)(t.toast.actionButtonStyle||t.actionButtonStyle),class:(0,e.normalizeClass)((0,e.unref)(O)(t.classes?.actionButton,t.toast.classes?.actionButton)),"data-button":``,"data-action":``,onClick:n[1]||=n=>{(0,e.unref)(v)(t.toast.action)&&(t.toast.action.onClick?.(n),!n.defaultPrevented&&q())}},(0,e.toDisplayString)((0,e.unref)(v)(t.toast.action)?t.toast.action?.label:t.toast.action),7)):(0,e.createCommentVNode)(`v-if`,!0)],64))],46,j))}}),P=N,F=(e,t)=>{let n=e.__vccOpts||e;for(let[e,r]of t)n[e]=r;return n};let I={},L={xmlns:`http://www.w3.org/2000/svg`,width:`12`,height:`12`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stoke-width":`1.5`,"stroke-linecap":`round`,"stroke-linejoin":`round`};function R(t,n){return(0,e.openBlock)(),(0,e.createElementBlock)(`svg`,L,n[0]||=[(0,e.createElementVNode)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`},null,-1),(0,e.createElementVNode)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`},null,-1)])}var z=F(I,[[`render`,R]]);let B=[`data-visible`],V={class:`sonner-spinner`};var H=(0,e.defineComponent)({__name:`Loader`,props:{visible:{type:Boolean}},setup(t){let n=Array(12).fill(0);return(t,r)=>((0,e.openBlock)(),(0,e.createElementBlock)(`div`,{class:`sonner-loading-wrapper`,"data-visible":t.visible},[(0,e.createElementVNode)(`div`,V,[((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)((0,e.unref)(n),t=>((0,e.openBlock)(),(0,e.createElementBlock)(`div`,{key:`spinner-bar-${t}`,class:`sonner-loading-bar`}))),128))])],8,B))}}),U=H;let W={},G={xmlns:`http://www.w3.org/2000/svg`,viewBox:`0 0 20 20`,fill:`currentColor`,height:`20`,width:`20`};function K(t,n){return(0,e.openBlock)(),(0,e.createElementBlock)(`svg`,G,n[0]||=[(0,e.createElementVNode)(`path`,{"fill-rule":`evenodd`,d:`M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z`,"clip-rule":`evenodd`},null,-1)])}var q=F(W,[[`render`,K]]);let J={},Y={xmlns:`http://www.w3.org/2000/svg`,viewBox:`0 0 20 20`,fill:`currentColor`,height:`20`,width:`20`};function X(t,n){return(0,e.openBlock)(),(0,e.createElementBlock)(`svg`,Y,n[0]||=[(0,e.createElementVNode)(`path`,{"fill-rule":`evenodd`,d:`M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z`,"clip-rule":`evenodd`},null,-1)])}var Z=F(J,[[`render`,X]]);let Q={},$={xmlns:`http://www.w3.org/2000/svg`,viewBox:`0 0 24 24`,fill:`currentColor`,height:`20`,width:`20`};function ee(t,n){return(0,e.openBlock)(),(0,e.createElementBlock)(`svg`,$,n[0]||=[(0,e.createElementVNode)(`path`,{"fill-rule":`evenodd`,d:`M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z`,"clip-rule":`evenodd`},null,-1)])}var te=F(Q,[[`render`,ee]]);let ne={},re={xmlns:`http://www.w3.org/2000/svg`,viewBox:`0 0 20 20`,fill:`currentColor`,height:`20`,width:`20`};function ie(t,n){return(0,e.openBlock)(),(0,e.createElementBlock)(`svg`,re,n[0]||=[(0,e.createElementVNode)(`path`,{"fill-rule":`evenodd`,d:`M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z`,"clip-rule":`evenodd`},null,-1)])}var ae=F(ne,[[`render`,ie]]);let oe=[`aria-label`],se=[`data-sonner-theme`,`dir`,`data-theme`,`data-rich-colors`,`data-y-position`,`data-x-position`],ce=typeof window<`u`&&typeof document<`u`;function le(){if(typeof window>`u`||typeof document>`u`)return`ltr`;let e=document.documentElement.getAttribute(`dir`);return e===`auto`||!e?window.getComputedStyle(document.documentElement).direction:e}var ue=(0,e.defineComponent)({name:`Toaster`,inheritAttrs:!1,__name:`Toaster`,props:{id:{},invert:{type:Boolean,default:!1},theme:{default:`light`},position:{default:`bottom-right`},closeButtonPosition:{default:`top-left`},hotkey:{default:()=>[`altKey`,`KeyT`]},richColors:{type:Boolean,default:!1},expand:{type:Boolean,default:!1},duration:{},gap:{default:w},visibleToasts:{default:y},closeButton:{type:Boolean,default:!1},toastOptions:{default:()=>({})},class:{default:``},style:{},offset:{default:b},mobileOffset:{default:x},dir:{default:`auto`},swipeDirections:{},icons:{},containerAriaLabel:{default:`Notifications`}},setup(t){let n=t,r=(0,e.useAttrs)(),i=(0,e.ref)([]),a=(0,e.computed)(()=>n.id?i.value.filter(e=>e.toasterId===n.id):i.value.filter(e=>!e.toasterId));function o(e,t){return a.value.filter(n=>!n.position&&t===0||n.position===e)}let s=(0,e.computed)(()=>{let e=a.value.filter(e=>e.position).map(e=>e.position);return e.length>0?Array.from(new Set([n.position].concat(e))):[n.position]}),c=(0,e.computed)(()=>{let e={};return s.value.forEach(t=>{e[t]=i.value.filter(e=>e.position===t)}),e}),l=(0,e.ref)([]),u=(0,e.ref)({}),f=(0,e.ref)(!1);(0,e.watchEffect)(()=>{s.value.forEach(e=>{e in u.value||(u.value[e]=!1)})});let p=(0,e.ref)(n.theme===`system`?typeof window<`u`&&window.matchMedia&&window.matchMedia(`(prefers-color-scheme: dark)`).matches?`dark`:`light`:n.theme),m=(0,e.ref)(null),h=(0,e.ref)(null),g=(0,e.ref)(!1),_=n.hotkey.join(`+`).replace(/Key/g,``).replace(/Digit/g,``);function v(e){i.value.find(t=>t.id===e.id)?.delete||d.dismiss(e.id),i.value=i.value.filter(({id:t})=>t!==e.id),setTimeout(()=>{i.value.find(t=>t.id===e.id)||(l.value=l.value.filter(t=>t.toastId!==e.id))},E+50)}function y(e){g.value&&!e.currentTarget?.contains?.(e.relatedTarget)&&(g.value=!1,h.value&&(h.value.focus({preventScroll:!0}),h.value=null))}function b(e){let t=e.target instanceof HTMLElement&&e.target.dataset.dismissible===`false`;t||g.value||(g.value=!0,h.value=e.relatedTarget)}function x(e){if(e.target){let t=e.target instanceof HTMLElement&&e.target.dataset.dismissible===`false`;if(t)return}f.value=!0}(0,e.watchEffect)(t=>{let n=d.subscribe(t=>{if(t.dismiss){requestAnimationFrame(()=>{i.value=i.value.map(e=>e.id===t.id?{...e,delete:!0}:e)});return}(0,e.nextTick)(()=>{let e=i.value.findIndex(e=>e.id===t.id);e===-1?i.value=[t,...i.value]:i.value=[...i.value.slice(0,e),{...i.value[e],...t},...i.value.slice(e+1)]})});t(n)}),(0,e.watchEffect)(e=>{if(typeof window>`u`)return;if(n.theme!==`system`){p.value=n.theme;return}let t=window.matchMedia(`(prefers-color-scheme: dark)`),r=e=>{p.value=e?`dark`:`light`};r(t.matches);let i=e=>{r(e.matches)};try{t.addEventListener(`change`,i)}catch{t.addListener(i)}e(()=>{try{t.removeEventListener(`change`,i)}catch{t.removeListener(i)}})}),(0,e.watchEffect)(()=>{m.value&&h.value&&(h.value.focus({preventScroll:!0}),h.value=null,g.value=!1)}),(0,e.watchEffect)(()=>{i.value.length<=1&&Object.keys(u.value).forEach(e=>{u.value[e]=!1})}),(0,e.watchEffect)(e=>{function t(e){let t=n.hotkey.every(t=>e[t]||e.code===t),r=Array.isArray(m.value)?m.value[0]:m.value;t&&(s.value.forEach(e=>{u.value[e]=!0}),r?.focus());let i=document.activeElement===m.value||r?.contains(document.activeElement);e.code===`Escape`&&i&&s.value.forEach(e=>{u.value[e]=!1})}ce&&(document.addEventListener(`keydown`,t),e(()=>{document.removeEventListener(`keydown`,t)}))});function S(e){let t=e.currentTarget,n=t.getAttribute(`data-y-position`)+`-`+t.getAttribute(`data-x-position`);u.value[n]=!0}function w(e){if(!f.value){let t=e.currentTarget,n=t.getAttribute(`data-y-position`)+`-`+t.getAttribute(`data-x-position`);u.value[n]=!1}}function T(){Object.keys(u.value).forEach(e=>{u.value[e]=!1})}function D(){f.value=!1}function O(e){l.value=e}function k(e){let t=l.value.findIndex(t=>t.toastId===e.toastId);if(t!==-1)l.value[t]=e;else{let t=l.value.findIndex(t=>t.position===e.position);t===-1?l.value.unshift(e):l.value.splice(t,0,e)}}return(t,i)=>((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,null,[(0,e.createCommentVNode)(` Remove item from normal navigation flow, only available via hotkey `),(0,e.createElementVNode)(`section`,{"aria-label":`${t.containerAriaLabel} ${(0,e.unref)(_)}`,tabIndex:-1,"aria-live":`polite`,"aria-relevant":`additions text`,"aria-atomic":`false`},[((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(s.value,(i,a)=>((0,e.openBlock)(),(0,e.createElementBlock)(`ol`,(0,e.mergeProps)({key:i,ref_for:!0,ref_key:`listRef`,ref:m,"data-sonner-toaster":``,"data-sonner-theme":p.value,class:n.class,dir:t.dir===`auto`?le():t.dir,tabIndex:-1,"data-theme":t.theme,"data-rich-colors":t.richColors,"data-y-position":i.split(`-`)[0],"data-x-position":i.split(`-`)[1],style:{"--front-toast-height":`${l.value[0]?.height||0}px`,"--width":`${(0,e.unref)(C)}px`,"--gap":`${t.gap}px`,...t.style,...(0,e.unref)(r).style,...(0,e.unref)(A)(t.offset,t.mobileOffset)}},{ref_for:!0},t.$attrs,{onBlur:y,onFocus:b,onMouseenter:S,onMousemove:S,onMouseleave:w,onDragend:T,onPointerdown:x,onPointerup:D}),[((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(o(i,a),(r,a)=>((0,e.openBlock)(),(0,e.createBlock)(P,{key:r.id,heights:l.value,icons:t.icons,index:a,toast:r,defaultRichColors:t.richColors,duration:t.toastOptions?.duration??t.duration,class:(0,e.normalizeClass)(t.toastOptions?.class??``),descriptionClass:t.toastOptions?.descriptionClass,invert:t.invert,visibleToasts:t.visibleToasts,closeButton:t.toastOptions?.closeButton??t.closeButton,interacting:f.value,position:i,closeButtonPosition:t.toastOptions?.closeButtonPosition??t.closeButtonPosition,style:(0,e.normalizeStyle)(t.toastOptions?.style),unstyled:t.toastOptions?.unstyled,classes:t.toastOptions?.classes,cancelButtonStyle:t.toastOptions?.cancelButtonStyle,actionButtonStyle:t.toastOptions?.actionButtonStyle,"close-button-aria-label":t.toastOptions?.closeButtonAriaLabel,toasts:c.value[i],expandByDefault:t.expand,gap:t.gap,expanded:u.value[i]||!1,swipeDirections:n.swipeDirections,"onUpdate:heights":O,"onUpdate:height":k,onRemoveToast:v},{"close-icon":(0,e.withCtx)(()=>[(0,e.renderSlot)(t.$slots,`close-icon`,{},()=>[(0,e.createVNode)(z)])]),"loading-icon":(0,e.withCtx)(()=>[(0,e.renderSlot)(t.$slots,`loading-icon`,{},()=>[(0,e.createVNode)(U,{visible:r.type===`loading`},null,8,[`visible`])])]),"success-icon":(0,e.withCtx)(()=>[(0,e.renderSlot)(t.$slots,`success-icon`,{},()=>[(0,e.createVNode)(q)])]),"error-icon":(0,e.withCtx)(()=>[(0,e.renderSlot)(t.$slots,`error-icon`,{},()=>[(0,e.createVNode)(ae)])]),"warning-icon":(0,e.withCtx)(()=>[(0,e.renderSlot)(t.$slots,`warning-icon`,{},()=>[(0,e.createVNode)(te)])]),"info-icon":(0,e.withCtx)(()=>[(0,e.renderSlot)(t.$slots,`info-icon`,{},()=>[(0,e.createVNode)(Z)])]),_:2},1032,[`heights`,`icons`,`index`,`toast`,`defaultRichColors`,`duration`,`class`,`descriptionClass`,`invert`,`visibleToasts`,`closeButton`,`interacting`,`position`,`closeButtonPosition`,`style`,`unstyled`,`classes`,`cancelButtonStyle`,`actionButtonStyle`,`close-button-aria-label`,`toasts`,`expandByDefault`,`gap`,`expanded`,`swipeDirections`]))),128))],16,se))),128))],8,oe)],2112))}}),de=ue;let fe={install(e){e.config.globalProperties.$toast=_,e.component(`Toaster`,de),e.provide(`toast`,_),typeof window<`u`&&(window.toast=_)}};var pe=fe;return pe});function e(e,t=`top`){if(!e||typeof document>`u`)return;let n=document.head||document.querySelector(`head`),r=n.querySelector(`:first-child`),i=document.createElement(`style`);i.appendChild(document.createTextNode(e)),t===`top`&&r?n.insertBefore(i,r):n.appendChild(i)}e(`
html[dir='ltr'],
[data-sonner-toaster][dir='ltr'] {
  --toast-icon-margin-start: -3px;
  --toast-icon-margin-end: 4px;
  --toast-svg-margin-start: -1px;
  --toast-svg-margin-end: 0px;
  --toast-button-margin-start: auto;
  --toast-button-margin-end: 0;
}
html[dir='rtl'],
[data-sonner-toaster][dir='rtl'] {
  --toast-icon-margin-start: 4px;
  --toast-icon-margin-end: -3px;
  --toast-svg-margin-start: 0px;
  --toast-svg-margin-end: -1px;
  --toast-button-margin-start: 0;
  --toast-button-margin-end: auto;
}
[data-sonner-toaster] {
  position: fixed;
  width: var(--width);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial,
    Noto Sans, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;
  --gray1: hsl(0, 0%, 99%);
  --gray2: hsl(0, 0%, 97.3%);
  --gray3: hsl(0, 0%, 95.1%);
  --gray4: hsl(0, 0%, 93%);
  --gray5: hsl(0, 0%, 90.9%);
  --gray6: hsl(0, 0%, 88.7%);
  --gray7: hsl(0, 0%, 85.8%);
  --gray8: hsl(0, 0%, 78%);
  --gray9: hsl(0, 0%, 56.1%);
  --gray10: hsl(0, 0%, 52.3%);
  --gray11: hsl(0, 0%, 43.5%);
  --gray12: hsl(0, 0%, 9%);
  --border-radius: 8px;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  list-style: none;
  outline: none;
  z-index: 999999999;
  transition: transform 400ms ease;
}
@media (hover: none) and (pointer: coarse) {
[data-sonner-toaster][data-lifted='true'] {
    transform: none;
}
}
[data-sonner-toaster][data-x-position='right'] {
  right: var(--offset-right);
}
[data-sonner-toaster][data-x-position='left'] {
  left: var(--offset-left);
}
[data-sonner-toaster][data-x-position='center'] {
  left: 50%;
  transform: translateX(-50%);
}
[data-sonner-toaster][data-y-position='top'] {
  top: var(--offset-top);
}
[data-sonner-toaster][data-y-position='bottom'] {
  bottom: var(--offset-bottom);
}
[data-sonner-toast] {
  --y: translateY(100%);
  --lift-amount: calc(var(--lift) * var(--gap));
  z-index: var(--z-index);
  position: absolute;
  opacity: 0;
  transform: var(--y);
  touch-action: none;
  transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms;
  box-sizing: border-box;
  outline: none;
  overflow-wrap: anywhere;
}
[data-sonner-toast][data-styled='true'] {
  padding: 16px;
  background: var(--normal-bg);
  border: 1px solid var(--normal-border);
  color: var(--normal-text);
  border-radius: var(--border-radius);
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  width: var(--width);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}
[data-sonner-toast]:focus-visible {
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(0, 0, 0, 0.2);
}
[data-sonner-toast][data-y-position='top'] {
  top: 0;
  --y: translateY(-100%);
  --lift: 1;
  --lift-amount: calc(1 * var(--gap));
}
[data-sonner-toast][data-y-position='bottom'] {
  bottom: 0;
  --y: translateY(100%);
  --lift: -1;
  --lift-amount: calc(var(--lift) * var(--gap));
}
[data-sonner-toast][data-styled='true'] [data-description] {
  font-weight: 400;
  line-height: 1.4;
  color: #3f3f3f;
}
[data-rich-colors='true'][data-sonner-toast][data-styled='true'] [data-description] {
  color: inherit;
}
[data-sonner-toaster][data-sonner-theme='dark'] [data-description] {
  color: hsl(0, 0%, 91%);
}
[data-sonner-toast][data-styled='true'] [data-title] {
  font-weight: 500;
  line-height: 1.5;
  color: inherit;
}
[data-sonner-toast][data-styled='true'] [data-icon] {
  display: flex;
  height: 16px;
  width: 16px;
  position: relative;
  justify-content: flex-start;
  align-items: center;
  flex-shrink: 0;
  margin-left: var(--toast-icon-margin-start);
  margin-right: var(--toast-icon-margin-end);
}
[data-sonner-toast][data-promise='true'] [data-icon] > svg {
  opacity: 0;
  transform: scale(0.8);
  transform-origin: center;
  animation: sonner-fade-in 300ms ease forwards;
}
[data-sonner-toast][data-styled='true'] [data-icon] > * {
  flex-shrink: 0;
}
[data-sonner-toast][data-styled='true'] [data-icon] svg {
  margin-left: var(--toast-svg-margin-start);
  margin-right: var(--toast-svg-margin-end);
}
[data-sonner-toast][data-styled='true'] [data-content] {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
[data-sonner-toast][data-styled='true'] [data-button] {
  border-radius: 4px;
  padding-left: 8px;
  padding-right: 8px;
  height: 24px;
  font-size: 12px;
  color: var(--normal-bg);
  background: var(--normal-text);
  margin-left: var(--toast-button-margin-start);
  margin-right: var(--toast-button-margin-end);
  border: none;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: opacity 400ms, box-shadow 200ms;
}
[data-sonner-toast][data-styled='true'] [data-button]:focus-visible {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
}
[data-sonner-toast][data-styled='true'] [data-button]:first-of-type {
  margin-left: var(--toast-button-margin-start);
  margin-right: var(--toast-button-margin-end);
}
[data-sonner-toast][data-styled='true'] [data-cancel] {
  color: var(--normal-text);
  background: rgba(0, 0, 0, 0.08);
}
[data-sonner-toaster][data-sonner-theme='dark'] [data-sonner-toast][data-styled='true'] [data-cancel] {
  background: rgba(255, 255, 255, 0.3);
}
[data-sonner-toaster] [data-close-button-position='top-left'] {
  --toast-close-button-left: 0;
  --toast-close-button-right: unset;
  --toast-close-button-top: 0;
  --toast-close-button-bottom: unset;
  --toast-close-button-transform: translate(-35%, -35%);
}
[data-sonner-toaster] [data-close-button-position='top-right'] {
  --toast-close-button-left: unset;
  --toast-close-button-right: 0;
  --toast-close-button-top: 0;
  --toast-close-button-bottom: unset;
  --toast-close-button-transform: translate(35%, -35%);
}
[data-sonner-toaster] [data-close-button-position='bottom-left'] {
  --toast-close-button-left: 0;
  --toast-close-button-right: unset;
  --toast-close-button-top: unset;
  --toast-close-button-bottom: 0;
  --toast-close-button-transform: translate(-35%, 35%);
}
[data-sonner-toaster] [data-close-button-position='bottom-right'] {
  --toast-close-button-left: unset;
  --toast-close-button-right: 0;
  --toast-close-button-top: unset;
  --toast-close-button-bottom: 0;
  --toast-close-button-transform: translate(35%, 35%);
}
[data-sonner-toast][data-styled='true'] [data-close-button] {
  position: absolute;
  left: var(--toast-close-button-left);
  right: var(--toast-close-button-right);
  top: var(--toast-close-button-top);
  bottom: var(--toast-close-button-bottom);
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  color: var(--gray12);
  background: var(--normal-bg);
  border: 1px solid var(--gray4);
  transform: var(--toast-close-button-transform);
  border-radius: 50%;
  cursor: pointer;
  z-index: 1;
  transition: opacity 100ms, background 200ms, border-color 200ms;
}
[data-sonner-toast][data-styled='true'] [data-close-button]:focus-visible {
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(0, 0, 0, 0.2);
}
[data-sonner-toast][data-styled='true'] [data-disabled='true'] {
  cursor: not-allowed;
}
[data-sonner-toast][data-styled='true']:hover [data-close-button]:hover {
  background: var(--gray2);
  border-color: var(--gray5);
}
[data-sonner-toast][data-swiping='true']::before {
  content: '';
  position: absolute;
  left: -100%;
  right: -100%;
  height: 100%;
  z-index: -1;
}
[data-sonner-toast][data-y-position='top'][data-swiping='true']::before {
  bottom: 50%;
  transform: scaleY(3) translateY(50%);
}
[data-sonner-toast][data-y-position='bottom'][data-swiping='true']::before {
  top: 50%;
  transform: scaleY(3) translateY(-50%);
}
[data-sonner-toast][data-swiping='false'][data-removed='true']::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: scaleY(2);
}
[data-sonner-toast][data-expanded='true']::after {
  content: '';
  position: absolute;
  left: 0;
  height: calc(var(--gap) + 1px);
  bottom: 100%;
  width: 100%;
}
[data-sonner-toast][data-mounted='true'] {
  --y: translateY(0);
  opacity: 1;
}
[data-sonner-toast][data-expanded='false'][data-front='false'] {
  --scale: var(--toasts-before) * 0.05 + 1;
  --y: translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--toasts-before) * 0.05 + 1));
  height: var(--front-toast-height);
}
[data-sonner-toast] > * {
  transition: opacity 400ms;
}
[data-sonner-toast][data-x-position='right'] {
  right: 0;
}
[data-sonner-toast][data-x-position='left'] {
  left: 0;
}
[data-sonner-toast][data-expanded='false'][data-front='false'][data-styled='true'] > * {
  opacity: 0;
}
[data-sonner-toast][data-visible='false'] {
  opacity: 0;
  pointer-events: none;
}
[data-sonner-toast][data-mounted='true'][data-expanded='true'] {
  --y: translateY(calc(var(--lift) * var(--offset)));
  height: var(--initial-height);
}
[data-sonner-toast][data-removed='true'][data-front='true'][data-swipe-out='false'] {
  --y: translateY(calc(var(--lift) * -100%));
  opacity: 0;
}
[data-sonner-toast][data-removed='true'][data-front='false'][data-swipe-out='false'][data-expanded='true'] {
  --y: translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));
  opacity: 0;
}
[data-sonner-toast][data-removed='true'][data-front='false'][data-swipe-out='false'][data-expanded='false'] {
  --y: translateY(40%);
  opacity: 0;
  transition: transform 500ms, opacity 200ms;
}
[data-sonner-toast][data-removed='true'][data-front='false']::before {
  height: calc(var(--initial-height) + 20%);
}
[data-sonner-toast][data-swiping='true'] {
  transform: var(--y) translateY(var(--swipe-amount-y, 0px)) translateX(var(--swipe-amount-x, 0px));
  transition: none;
}
[data-sonner-toast][data-swiped='true'] {
  user-select: none;
}
[data-sonner-toast][data-swipe-out='true'][data-y-position='bottom'],
[data-sonner-toast][data-swipe-out='true'][data-y-position='top'] {
  animation-duration: 200ms;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}
[data-sonner-toast][data-swipe-out='true'][data-swipe-direction='left'] {
  animation-name: swipe-out-left;
}
[data-sonner-toast][data-swipe-out='true'][data-swipe-direction='right'] {
  animation-name: swipe-out-right;
}
[data-sonner-toast][data-swipe-out='true'][data-swipe-direction='up'] {
  animation-name: swipe-out-up;
}
[data-sonner-toast][data-swipe-out='true'][data-swipe-direction='down'] {
  animation-name: swipe-out-down;
}
@keyframes swipe-out-left {
from {
    transform: var(--y) translateX(var(--swipe-amount-x));
    opacity: 1;
}
to {
    transform: var(--y) translateX(calc(var(--swipe-amount-x) - 100%));
    opacity: 0;
}
}
@keyframes swipe-out-right {
from {
    transform: var(--y) translateX(var(--swipe-amount-x));
    opacity: 1;
}
to {
    transform: var(--y) translateX(calc(var(--swipe-amount-x) + 100%));
    opacity: 0;
}
}
@keyframes swipe-out-up {
from {
    transform: var(--y) translateY(var(--swipe-amount-y));
    opacity: 1;
}
to {
    transform: var(--y) translateY(calc(var(--swipe-amount-y) - 100%));
    opacity: 0;
}
}
@keyframes swipe-out-down {
from {
    transform: var(--y) translateY(var(--swipe-amount-y));
    opacity: 1;
}
to {
    transform: var(--y) translateY(calc(var(--swipe-amount-y) + 100%));
    opacity: 0;
}
}
@media (max-width: 600px) {
[data-sonner-toaster] {
    position: fixed;
    right: var(--mobile-offset-right);
    left: var(--mobile-offset-left);
    width: 100%;
}
[data-sonner-toaster][dir='rtl'] {
    left: calc(var(--mobile-offset-left) * -1);
}
[data-sonner-toaster] [data-sonner-toast] {
    left: 0;
    right: 0;
    width: calc(100% - var(--mobile-offset-left) * 2);
}
[data-sonner-toaster][data-x-position='left'] {
    left: var(--mobile-offset-left);
}
[data-sonner-toaster][data-y-position='bottom'] {
    bottom: calc(var(--mobile-offset-bottom) + max(env(safe-area-inset-bottom), 0px));
}
[data-sonner-toaster][data-y-position='top'] {
    top: calc(var(--mobile-offset-top) + max(env(safe-area-inset-top), 0px));
}
[data-sonner-toaster][data-x-position='center'] {
    left: var(--mobile-offset-left);
    right: var(--mobile-offset-right);
    transform: none;
}
}
[data-sonner-toaster][data-sonner-theme='light'] {
  --normal-bg: #fff;
  --normal-border: var(--gray4);
  --normal-text: var(--gray12);

  --success-bg: hsl(143, 85%, 96%);
  --success-border: hsl(145, 92%, 87%);
  --success-text: hsl(140, 100%, 27%);

  --info-bg: hsl(208, 100%, 97%);
  --info-border: hsl(221, 91%, 93%);
  --info-text: hsl(210, 92%, 45%);

  --warning-bg: hsl(49, 100%, 97%);
  --warning-border: hsl(49, 91%, 84%);
  --warning-text: hsl(31, 92%, 45%);

  --error-bg: hsl(359, 100%, 97%);
  --error-border: hsl(359, 100%, 94%);
  --error-text: hsl(360, 100%, 45%);
}
[data-sonner-toaster][data-sonner-theme='light'] [data-sonner-toast][data-invert='true'] {
  --normal-bg: #000;
  --normal-border: hsl(0, 0%, 20%);
  --normal-text: var(--gray1);
}
[data-sonner-toaster][data-sonner-theme='dark'] [data-sonner-toast][data-invert='true'] {
  --normal-bg: #fff;
  --normal-border: var(--gray3);
  --normal-text: var(--gray12);
}
[data-sonner-toaster][data-sonner-theme='dark'] {
  --normal-bg: #000;
  --normal-bg-hover: hsl(0, 0%, 12%);
  --normal-border: hsl(0, 0%, 20%);
  --normal-border-hover: hsl(0, 0%, 25%);
  --normal-text: var(--gray1);

  --success-bg: hsl(150, 100%, 6%);
  --success-border: hsl(147, 100%, 12%);
  --success-text: hsl(150, 86%, 65%);

  --info-bg: hsl(215, 100%, 6%);
  --info-border: hsl(223, 43%, 17%);
  --info-text: hsl(216, 87%, 65%);

  --warning-bg: hsl(64, 100%, 6%);
  --warning-border: hsl(60, 100%, 9%);
  --warning-text: hsl(46, 87%, 65%);

  --error-bg: hsl(358, 76%, 10%);
  --error-border: hsl(357, 89%, 16%);
  --error-text: hsl(358, 100%, 81%);
}
[data-sonner-toaster][data-sonner-theme='dark'] [data-sonner-toast] [data-close-button] {
  background: var(--normal-bg);
  border-color: var(--normal-border);
  color: var(--normal-text);
}
[data-sonner-toaster][data-sonner-theme='dark'] [data-sonner-toast] [data-close-button]:hover {
  background: var(--normal-bg-hover);
  border-color: var(--normal-border-hover);
}
[data-rich-colors='true'][data-sonner-toast][data-type='success'] {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='success'] [data-close-button] {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='info'] {
  background: var(--info-bg);
  border-color: var(--info-border);
  color: var(--info-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='info'] [data-close-button] {
  background: var(--info-bg);
  border-color: var(--info-border);
  color: var(--info-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='warning'] {
  background: var(--warning-bg);
  border-color: var(--warning-border);
  color: var(--warning-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='warning'] [data-close-button] {
  background: var(--warning-bg);
  border-color: var(--warning-border);
  color: var(--warning-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='error'] {
  background: var(--error-bg);
  border-color: var(--error-border);
  color: var(--error-text);
}
[data-rich-colors='true'][data-sonner-toast][data-type='error'] [data-close-button] {
  background: var(--error-bg);
  border-color: var(--error-border);
  color: var(--error-text);
}
.sonner-loading-wrapper {
  --size: 16px;
  height: var(--size);
  width: var(--size);
  position: absolute;
  inset: 0;
  z-index: 10;
}
.sonner-loading-wrapper[data-visible='false'] {
  transform-origin: center;
  animation: sonner-fade-out 0.2s ease forwards;
}
.sonner-spinner {
  position: relative;
  top: 50%;
  left: 50%;
  height: var(--size);
  width: var(--size);
}
.sonner-loading-bar {
  animation: sonner-spin 1.2s linear infinite;
  background: var(--gray11);
  border-radius: 6px;
  height: 8%;
  left: -10%;
  position: absolute;
  top: -3.9%;
  width: 24%;
}
.sonner-loading-bar:nth-child(1) {
  animation-delay: -1.2s;
  transform: rotate(0.0001deg) translate(146%);
}
.sonner-loading-bar:nth-child(2) {
  animation-delay: -1.1s;
  transform: rotate(30deg) translate(146%);
}
.sonner-loading-bar:nth-child(3) {
  animation-delay: -1s;
  transform: rotate(60deg) translate(146%);
}
.sonner-loading-bar:nth-child(4) {
  animation-delay: -0.9s;
  transform: rotate(90deg) translate(146%);
}
.sonner-loading-bar:nth-child(5) {
  animation-delay: -0.8s;
  transform: rotate(120deg) translate(146%);
}
.sonner-loading-bar:nth-child(6) {
  animation-delay: -0.7s;
  transform: rotate(150deg) translate(146%);
}
.sonner-loading-bar:nth-child(7) {
  animation-delay: -0.6s;
  transform: rotate(180deg) translate(146%);
}
.sonner-loading-bar:nth-child(8) {
  animation-delay: -0.5s;
  transform: rotate(210deg) translate(146%);
}
.sonner-loading-bar:nth-child(9) {
  animation-delay: -0.4s;
  transform: rotate(240deg) translate(146%);
}
.sonner-loading-bar:nth-child(10) {
  animation-delay: -0.3s;
  transform: rotate(270deg) translate(146%);
}
.sonner-loading-bar:nth-child(11) {
  animation-delay: -0.2s;
  transform: rotate(300deg) translate(146%);
}
.sonner-loading-bar:nth-child(12) {
  animation-delay: -0.1s;
  transform: rotate(330deg) translate(146%);
}
@keyframes sonner-fade-in {
0% {
    opacity: 0;
    transform: scale(0.8);
}
100% {
    opacity: 1;
    transform: scale(1);
}
}
@keyframes sonner-fade-out {
0% {
    opacity: 1;
    transform: scale(1);
}
100% {
    opacity: 0;
    transform: scale(0.8);
}
}
@keyframes sonner-spin {
0% {
    opacity: 1;
}
100% {
    opacity: 0.15;
}
}
@media (prefers-reduced-motion) {
[data-sonner-toast],
  [data-sonner-toast] > *,
  .sonner-loading-bar {
    transition: none !important;
    animation: none !important;
}
}
.sonner-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center;
  transition: opacity 200ms, transform 200ms;
}
.sonner-loader[data-visible='false'] {
  opacity: 0;
  transform: scale(0.8) translate(-50%, -50%);
}
`,`top`);