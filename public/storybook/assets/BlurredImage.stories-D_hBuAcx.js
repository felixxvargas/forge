import{i as e,l as t}from"./preload-helper-DID7B_--.js";import{n,r}from"./iframe-kNRgY_dk.js";import{K as i,t as a}from"./lucide-react-DqmvCjDU.js";function o({src:e,alt:t=`Post image`,isBlurred:n=!1,className:r=``}){let[a,o]=(0,c.useState)(!1),l=n&&!a;return(0,s.jsxs)(`div`,{className:`relative overflow-hidden rounded-lg ${r}`,children:[(0,s.jsx)(`img`,{src:e,alt:t,className:`w-full object-cover max-h-80 transition-all duration-300 ${l?`blur-xl scale-105 pointer-events-none select-none`:``}`}),l&&(0,s.jsx)(`button`,{onClick:()=>o(!0),className:`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-black/40 transition-colors`,children:(0,s.jsxs)(`div`,{className:`flex flex-col items-center gap-1.5 text-white drop-shadow`,children:[(0,s.jsx)(i,{className:`w-7 h-7`}),(0,s.jsx)(`span`,{className:`text-sm font-semibold`,children:`Sensitive content`}),(0,s.jsx)(`span`,{className:`text-xs opacity-80`,children:`Tap to view`})]})})]})}var s,c,l=e((()=>{s=n(),c=t(r(),1),a(),o.__docgenInfo={description:``,methods:[],displayName:`BlurredImage`,props:{src:{required:!0,tsType:{name:`string`},description:``},alt:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'Post image'`,computed:!1}},isBlurred:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`''`,computed:!1}}}}})),u,d,f,p,m,h;e((()=>{u=n(),l(),d=`https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80`,f={title:`Components/BlurredImage`,component:o,tags:[`autodocs`],parameters:{layout:`centered`},decorators:[e=>(0,u.jsx)(`div`,{style:{width:360},children:(0,u.jsx)(e,{})})]},p={args:{src:d,alt:`Gaming setup`,isBlurred:!1}},m={args:{src:d,alt:`Sensitive content`,isBlurred:!0}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    src: SAMPLE,
    alt: 'Gaming setup',
    isBlurred: false
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    src: SAMPLE,
    alt: 'Sensitive content',
    isBlurred: true
  }
}`,...m.parameters?.docs?.source}}},h=[`Visible`,`Blurred`]}))();export{m as Blurred,p as Visible,h as __namedExportsOrder,f as default};