import{i as e}from"./preload-helper-DID7B_--.js";import{A as t}from"./iframe-CaSO_SX-.js";import{Bt as n,E as r,Et as i,I as a,Jn as o,K as s,M as c,P as l,Qt as u,R as d,Rt as f,W as p,Xt as m,bn as h,c as g,en as _,et as v,f as y,gn as b,gt as x,n as S,o as C,on as w,ot as T,t as E,vn as D,vt as O,wn as k}from"./lucide-react-BR5-25y8.js";function A({iconKey:e,className:t=`w-8 h-8`}){return e&&[...e].some(e=>e.codePointAt(0)>8192)?(0,j.jsx)(`span`,{className:`text-2xl leading-none`,children:e}):(0,j.jsx)(N[e]??u,{className:t})}var j,M,N,P=e((()=>{j=t(),E(),M=[{key:`gamepad`,label:`Controller`,Icon:u},{key:`sword`,label:`Sword`,Icon:a},{key:`swords`,label:`Battle`,Icon:l},{key:`shield`,label:`Shield`,Icon:s},{key:`trophy`,label:`Trophy`,Icon:r},{key:`target`,label:`Target`,Icon:c},{key:`zap`,label:`Lightning`,Icon:S},{key:`star`,label:`Star`,Icon:d},{key:`flame`,label:`Fire`,Icon:_},{key:`crown`,label:`Crown`,Icon:h},{key:`rocket`,label:`Rocket`,Icon:v},{key:`globe`,label:`World`,Icon:m},{key:`map`,label:`Map`,Icon:i},{key:`compass`,label:`Compass`,Icon:k},{key:`brain`,label:`Mind`,Icon:o},{key:`skull`,label:`Skull`,Icon:p},{key:`wand`,label:`Magic`,Icon:g},{key:`layers`,label:`Levels`,Icon:n},{key:`mountain`,label:`Mountain`,Icon:O},{key:`users`,label:`Squad`,Icon:y},{key:`puzzle`,label:`Puzzle`,Icon:T},{key:`dice`,label:`Dice`,Icon:D},{key:`eye`,label:`Scout`,Icon:w},{key:`dumbbell`,label:`Power`,Icon:b},{key:`music`,label:`Rhythm`,Icon:x},{key:`leaf`,label:`Cozy`,Icon:f},{key:`waves`,label:`Chill`,Icon:C}],N=Object.fromEntries(M.map(({key:e,Icon:t})=>[e,t])),A.__docgenInfo={description:``,methods:[],displayName:`GroupIcon`,props:{iconKey:{required:!0,tsType:{name:`string`},description:``},className:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'w-8 h-8'`,computed:!1}}}}})),F,I,L,R,z,B,V;e((()=>{F=t(),P(),I={title:`Components/GroupIcon`,component:A,tags:[`autodocs`],parameters:{layout:`centered`},argTypes:{iconKey:{control:`select`,options:M.map(e=>e.key)}}},L={args:{iconKey:`gamepad`,className:`w-8 h-8`}},R={args:{iconKey:`trophy`,className:`w-8 h-8`}},z={args:{iconKey:`crown`,className:`w-16 h-16`}},B={render:()=>(0,F.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:16},children:M.map(({key:e,label:t,Icon:n})=>(0,F.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`,gap:4,width:56},children:[(0,F.jsx)(A,{iconKey:e,className:`w-8 h-8`}),(0,F.jsx)(`span`,{style:{fontSize:10,color:`#aaa`},children:t})]},e))})},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    iconKey: 'gamepad',
    className: 'w-8 h-8'
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  args: {
    iconKey: 'trophy',
    className: 'w-8 h-8'
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  args: {
    iconKey: 'crown',
    className: 'w-16 h-16'
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16
  }}>\r
      {GAMING_ICONS.map(({
      key,
      label,
      Icon
    }) => <div key={key} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      width: 56
    }}>\r
          <GroupIcon iconKey={key} className="w-8 h-8" />\r
          <span style={{
        fontSize: 10,
        color: '#aaa'
      }}>{label}</span>\r
        </div>)}\r
    </div>
}`,...B.parameters?.docs?.source}}},V=[`Default`,`Trophy`,`Large`,`AllIcons`]}))();export{B as AllIcons,L as Default,z as Large,R as Trophy,V as __namedExportsOrder,I as default};