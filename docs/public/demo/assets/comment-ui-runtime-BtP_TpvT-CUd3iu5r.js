var M=1,T=`
:where(.ooxml-comment-marker) {
  padding: 0;
  border: 0;
  cursor: pointer;
  pointer-events: auto;
  background: transparent;
  box-shadow: none;
  color: var(--ooxml-comment-marker-color, var(--ooxml-comment-author-accent));
}
:where([data-ooxml-comment-highlight]) {
  position: absolute;
  pointer-events: none;
  background: var(--ooxml-comment-highlight, color-mix(in srgb, var(--ooxml-comment-author-accent) 18%, transparent));
  transform-origin: top left;
}
:where([data-ooxml-comment-highlight][data-active="true"]) {
  background: var(--ooxml-comment-highlight-active, color-mix(in srgb, var(--ooxml-comment-author-accent) 34%, transparent));
}
:where([data-ooxml-comment-target]) {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  border-style: solid;
  border-color: var(--ooxml-comment-target-border, #2563eb);
  background: var(--ooxml-comment-target-background, rgba(37, 99, 235, .06));
  transform-origin: center;
}
:where(.ooxml-comment-card) {
  position: relative;
  display: block;
  width: 100%;
  margin: 0 0 var(--ooxml-comment-card-gap, .42em);
  box-sizing: border-box;
  padding: var(--ooxml-comment-card-padding, .56em .68em);
  border: 0;
  border-radius: var(--ooxml-comment-card-radius, .3em);
  text-align: start;
  cursor: default;
  font: inherit;
  outline: none;
  background: var(--ooxml-comment-card-background, #fff);
  box-shadow: var(--ooxml-comment-card-shadow, none);
}
:where(button.ooxml-comment-card) {
  cursor: pointer;
}
:where(.ooxml-comment-card[data-standalone="true"]) {
  position: absolute;
  width: max-content;
  max-width: 100%;
  margin: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
  font-size: 13px;
}
:where(.ooxml-comment-card[data-active="true"]) {
  background: var(--ooxml-comment-card-active-background, #eff6ff);
  box-shadow: var(--ooxml-comment-card-active-shadow, none);
}
:where(.ooxml-comment-card[data-focused="true"]) {
  box-shadow: var(--ooxml-comment-card-focus-shadow, 0 0 0 .12em rgba(37, 99, 235, .65));
}
:where(.ooxml-comment-card [data-ooxml-comment-part="content"]) {
  min-width: 0;
  flex: 1;
}
:where(.ooxml-comment-card [data-ooxml-comment-part="identity"]) {
  display: flex;
  align-items: baseline;
  gap: .48em;
  min-width: 0;
}
:where(.ooxml-comment-card__author) {
  min-width: 0;
  font: 700 .84em/1.3 var(--ooxml-comment-font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  color: var(--ooxml-comment-author-color, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:where(.ooxml-comment-card__date) {
  font: 500 .66em/1.35 var(--ooxml-comment-date-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  color: var(--ooxml-comment-muted-color, #64748b);
  white-space: nowrap;
}
:where(.ooxml-comment-card__body) {
  margin-top: .28em;
  font: 400 .84em/1.45 var(--ooxml-comment-font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  color: var(--ooxml-comment-body-color, #334155);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
:where(.ooxml-comment-card__reply) {
  margin: .55em 0 0 .45em;
  padding: .08em 0 0 .65em;
  border-left: .08em solid var(--ooxml-comment-reply-border, rgba(100, 116, 139, .24));
}
:where(.ooxml-comment-card [data-ooxml-comment-part="frame"]) {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  pointer-events: none;
  border-radius: inherit;
  border: var(--ooxml-comment-card-border, 1px solid rgba(148, 163, 184, .34));
  border-left: var(--ooxml-comment-card-border-left, .14em solid var(--ooxml-comment-author-accent));
  border-right: var(--ooxml-comment-card-border-right, var(--ooxml-comment-card-border, 1px solid rgba(148, 163, 184, .34)));
}
:where(.ooxml-comment-card[data-active="true"] [data-ooxml-comment-part="frame"]) {
  border: var(--ooxml-comment-card-active-border, 1px solid rgba(37, 99, 235, .5));
  border-left: var(--ooxml-comment-card-border-left, .14em solid var(--ooxml-comment-author-accent));
  border-right: var(--ooxml-comment-card-border-right, var(--ooxml-comment-card-active-border, 1px solid rgba(37, 99, 235, .5)));
}
:where([data-ooxml-comment-ui="margin"] > [data-ooxml-comment-item]) {
  position: absolute;
  left: 0;
  padding: 0 .14em;
  box-sizing: border-box;
  transform-origin: 0 0;
}
:where([data-ooxml-comment-ui="margin"] > [data-ooxml-comment-item]:last-child > .ooxml-comment-card) {
  margin-bottom: 0;
}
`;function S(e){let o=e.head;if(!o||o.querySelector("style[data-ooxml-comment-styles]"))return;let t=e.createElement("style");t.dataset.ooxmlCommentStyles="",t.textContent=T,o.appendChild(t)}function z(e){if(!e)return"#2563eb";let o=2166136261;for(let t of e.normalize("NFKC"))o^=t.codePointAt(0)??0,o=Math.imul(o,16777619);return`hsl(${(o>>>0)%360} 68% 42%)`}function F(e,o){S(e);let t=e.createElement("button");return t.type="button",t.setAttribute("class","ooxml-comment-marker"),t.dataset.ooxmlCommentId=o.occurrenceKey,t.dataset.ooxmlCommentMarker="",t.dataset.active=String(o.active),t.setAttribute("aria-label",`Comment ${o.visibleIndex+1}`),t.setAttribute("aria-pressed",String(o.active)),t.style.cssText=`--ooxml-comment-author-accent:${z(o.author)};position:absolute;transform:translate(-50%,-50%);width:${24*o.zoom}px;height:${24*o.zoom}px;`,t.innerHTML='<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 4C18.7956 4 19.5587 4.31607 20.1213 4.87868C20.6839 5.44129 21 6.20435 21 7V15C21 15.7956 20.6839 16.5587 20.1213 17.1213C19.5587 17.6839 18.7956 18 18 18H13L8 21V18H6C5.20435 18 4.44129 17.6839 3.87868 17.1213C3.31607 16.5587 3 15.7956 3 15V7C3 6.20435 3.31607 5.44129 3.87868 4.87868C4.44129 4.31607 5.20435 4 6 4H18Z"/></svg>',t.addEventListener("click",()=>o.onSetActive(o.occurrenceKey,!o.active)),t}var b=new WeakMap;function k(e,o){o&&typeof o.unobserve=="function"&&o.unobserve(e.card),e.card.removeEventListener("click",e.onClick),e.card.removeEventListener("focus",e.onFocus),e.card.removeEventListener("blur",e.onBlur),e.item.remove()}function $(e){var t;let o=b.get(e);b.delete(e);for(let n of(o==null?void 0:o.cards.values())??[])k(n,o==null?void 0:o.resizeObserver);o==null||o.cards.clear(),o&&e.removeEventListener("scroll",o.onScroll),(t=o==null?void 0:o.resizeObserver)==null||t.disconnect(),e.replaceChildren()}function B(e,o){let t=b.get(e);if(!t||t.cards.size===0||!Number.isFinite(o)||o<=0)return!1;let n=Number.parseFloat(e.dataset.ooxmlCommentZoom??""),i=Number.isFinite(n)&&n>0?n:t.zoom*o;for(let d of t.cards.values())d.item.style.top=`${d.committedTop*i}px`,d.item.style.transform=`scale(${i})`;return!0}function f(e,o=""){let t=e.createElement("div");return t.style.cssText=o,t}function A(e){if(!e)return;let o=new Date(e);return Number.isFinite(o.getTime())?new Intl.DateTimeFormat(void 0,{dateStyle:"medium",timeStyle:"short"}).format(o):e}function C(e,o){return e.messageKey===o.messageKey&&e.sourceId===o.sourceId&&e.author===o.author&&e.date===o.date&&e.text===o.text&&e.status===o.status}function _(e,o){return e.occurrenceKey===o.occurrenceKey&&C(e.root,o.root)&&e.replies.length===o.replies.length&&e.replies.every((t,n)=>C(t,o.replies[n]))}function E(e,o,t){let n=e.map((a,c)=>({...a,index:c})).sort((a,c)=>a.preferredTop-c.preferredTop||a.index-c.index),i=Math.max(0,t),d=n.reduce((a,c)=>a+Math.max(0,c.height),0)+i*Math.max(0,n.length-1);if(o<=0||d>o){let a=0;return new Map(n.map(c=>{let s=[c.occurrenceKey,a];return a+=Math.max(0,c.height)+i,s}))}let l=n.map(a=>Math.max(0,Math.min(a.preferredTop,o-a.height)));for(let a=1;a<n.length;a++){let c=l[a-1]+n[a-1].height+i;l[a]=Math.max(l[a],c)}if(n.length>0){let a=n.length-1;l[a]=Math.min(l[a],o-n[a].height);for(let c=a-1;c>=0;c--)l[c]=Math.min(l[c],l[c+1]-i-n[c].height);if(l[0]<0){let c=-l[0];for(let s=0;s<l.length;s++)l[s]+=c}}return new Map(n.map((a,c)=>[a.occurrenceKey,l[c]]))}function w(e,o,t){let n=e.ownerDocument,i=f(n);t&&i.setAttribute("class","ooxml-comment-card__reply"),i.dataset.ooxmlCommentPart=t?"reply":"comment";let d=f(n);d.dataset.ooxmlCommentPart="content";let l=f(n);l.dataset.ooxmlCommentPart="identity";let a=f(n);a.setAttribute("class","ooxml-comment-card__author"),a.dataset.ooxmlCommentPart="author",a.textContent=o.author||"Comment",l.appendChild(a);let c=A(o.date);if(c){let x=f(n);x.setAttribute("class","ooxml-comment-card__date"),x.dataset.ooxmlCommentPart="date",x.textContent=c,x.setAttribute("title",o.date),l.appendChild(x)}let s=f(n);s.setAttribute("class","ooxml-comment-card__body"),s.dataset.ooxmlCommentPart="body",s.textContent=o.text,d.appendChild(l),d.appendChild(s),i.appendChild(d),e.appendChild(i)}function K(e,o,t={}){S(e.ownerDocument);let n=t.active??!1,i=t.focused??!1,d=t.interactive??e.tagName==="BUTTON",l=z(o.root.author);e.setAttribute("class","ooxml-comment-card"),e.dataset.ooxmlCommentId=o.occurrenceKey,e.dataset.active=String(n),e.dataset.focused=String(i),e.dataset.standalone=String(t.standalone??!1),e.dataset.ooxmlCommentCard="",d?e.setAttribute("aria-pressed",String(n)):e.removeAttribute("aria-pressed"),e.style.cssText=`--ooxml-comment-author-accent:${l};`,e.replaceChildren(),w(e,o.root,!1);for(let c of o.replies)w(e,c,!0);let a=f(e.ownerDocument);a.dataset.ooxmlCommentPart="frame",a.setAttribute("aria-hidden","true"),e.appendChild(a)}function G(e,o,t){var s,x,v,y;e.setAttribute("role","list"),e.setAttribute("aria-label","Comments"),e.dataset.ooxmlCommentUi="margin",e.dataset.ooxmlCommentZoom=String(t.zoom);let n=b.get(e);if(!n){let r={cards:new Map,onScroll:()=>{var m;return(m=r.onScrollGeometryChange)==null?void 0:m.call(r)},zoom:t.zoom,onGeometryChange:t.onGeometryChange,onScrollGeometryChange:t.onScrollGeometryChange};if((t.onGeometryChange||t.onScrollGeometryChange)&&e.addEventListener("scroll",r.onScroll,{passive:!0}),t.onGeometryChange){let m=((s=e.ownerDocument.defaultView)==null?void 0:s.ResizeObserver)??globalThis.ResizeObserver;m&&(r.resizeObserver=new m(()=>{var u;return(u=r.onGeometryChange)==null?void 0:u.call(r)}))}n=r,b.set(e,n)}n.zoom=t.zoom,n.onGeometryChange=t.onGeometryChange,n.onScrollGeometryChange=t.onScrollGeometryChange;let i=new Set;for(let r of o){if(i.has(r.occurrenceKey))throw Error(`Duplicate comment occurrence key: ${r.occurrenceKey}`);i.add(r.occurrenceKey)}for(let[r,m]of[...n.cards])i.has(r)||(n.cards.delete(r),k(m,n.resizeObserver));for(let r of o){let m=n.cards.get(r.occurrenceKey);if(!m){let g=f(e.ownerDocument);g.setAttribute("role","listitem"),g.dataset.ooxmlCommentItem="";let p=e.ownerDocument.createElement("button");p.type="button",p.id=`ooxml-comment-card-${M++}`,p.dataset.ooxmlCommentCard="";let h={item:g,card:p,thread:r,painted:!1,focused:!1,active:!1,committedTop:0,onSetActive:t.onSetActive,onClick:()=>h.onSetActive(r.occurrenceKey,!h.active),onFocus:()=>{h.focused=!0,h.card.dataset.focused="true"},onBlur:()=>{h.focused=!1,h.card.dataset.focused="false"}};p.addEventListener("click",h.onClick),p.addEventListener("focus",h.onFocus),p.addEventListener("blur",h.onBlur),g.appendChild(p),n.cards.set(r.occurrenceKey,h),(x=n.resizeObserver)==null||x.observe(p),m=h}let u=t.activeId===r.occurrenceKey;m.onSetActive=t.onSetActive,(!m.painted||m.active!==u||!_(m.thread,r))&&K(m.card,r,{active:u,focused:m.focused,interactive:!0}),m.painted=!0,m.active=u,m.thread=r}let d=o.map((r,m)=>({thread:r,index:m})).sort((r,m)=>{var u,g;return(((u=t.preferredTopById)==null?void 0:u.get(r.thread.occurrenceKey))??0)-(((g=t.preferredTopById)==null?void 0:g.get(m.thread.occurrenceKey))??0)||r.index-m.index}).map(({thread:r})=>r).flatMap(r=>{let m=n.cards.get(r.occurrenceKey);return m?[m.item]:[]});(d.length!==e.children.length||d.some((r,m)=>e.children[m]!==r))&&e.replaceChildren(...d);for(let r of n.cards.values())r.item.style.cssText=`width:${t.logicalWidth}px;top:${r.committedTop*t.zoom}px;`;let l=(v=d[0])==null?void 0:v.children[0],a=l&&((y=e.ownerDocument.defaultView)!=null&&y.getComputedStyle)?Number.parseFloat(e.ownerDocument.defaultView.getComputedStyle(l).marginBottom):0,c=E(o.map(r=>{var u;let m=n.cards.get(r.occurrenceKey);return{occurrenceKey:r.occurrenceKey,preferredTop:(((u=t.preferredTopById)==null?void 0:u.get(r.occurrenceKey))??0)/t.zoom,height:(m==null?void 0:m.card.getBoundingClientRect().height)??0}}),e.clientHeight/t.zoom,Number.isFinite(a)?a:0);for(let r of n.cards.values())r.committedTop=c.get(r.thread.occurrenceKey)??0,r.item.style.top=`${r.committedTop*t.zoom}px`,r.item.style.transform=`scale(${t.zoom})`;return new Map(o.flatMap(r=>{let m=n.cards.get(r.occurrenceKey);return m?[[r.occurrenceKey,m.card]]:[]}))}const I=Object.freeze(Object.defineProperty({__proto__:null,paintReadOnlyCommentCard:K},Symbol.toStringTag,{value:"Module"}));export{I as a,B as c,G as g,F as i,S as n,z as r,$ as s};
