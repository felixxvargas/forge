import{i as e}from"./preload-helper-DID7B_--.js";import{n as t}from"./iframe-kNRgY_dk.js";import{A as n,B as r,E as i,H as a,I as o,J as s,K as c,M as l,O as u,Q as d,R as f,S as p,W as m,X as h,b as g,c as _,et as v,f as y,g as b,i as x,m as S,n as C,nt as w,o as T,t as E,u as D,v as O,w as k}from"./lucide-react-DqmvCjDU.js";function A({iconKey:e,className:t=`w-8 h-8`}){return e&&[...e].some(e=>e.codePointAt(0)>8192)?(0,j.jsx)(`span`,{className:`text-2xl leading-none`,children:e}):(0,j.jsx)(N[e]??a,{className:t})}var j,M,N,P=e((()=>{j=t(),E(),M=[{key:`gamepad`,label:`Controller`,Icon:a},{key:`sword`,label:`Sword`,Icon:b},{key:`swords`,label:`Battle`,Icon:S},{key:`shield`,label:`Shield`,Icon:p},{key:`trophy`,label:`Trophy`,Icon:D},{key:`target`,label:`Target`,Icon:y},{key:`zap`,label:`Lightning`,Icon:C},{key:`star`,label:`Star`,Icon:O},{key:`flame`,label:`Fire`,Icon:m},{key:`crown`,label:`Crown`,Icon:d},{key:`rocket`,label:`Rocket`,Icon:k},{key:`globe`,label:`World`,Icon:r},{key:`map`,label:`Map`,Icon:l},{key:`compass`,label:`Compass`,Icon:v},{key:`brain`,label:`Mind`,Icon:w},{key:`skull`,label:`Skull`,Icon:g},{key:`wand`,label:`Magic`,Icon:T},{key:`layers`,label:`Levels`,Icon:f},{key:`mountain`,label:`Mountain`,Icon:n},{key:`users`,label:`Squad`,Icon:_},{key:`puzzle`,label:`Puzzle`,Icon:i},{key:`dice`,label:`Dice`,Icon:h},{key:`eye`,label:`Scout`,Icon:c},{key:`dumbbell`,label:`Power`,Icon:s},{key:`music`,label:`Rhythm`,Icon:u},{key:`leaf`,label:`Cozy`,Icon:o},{key:`waves`,label:`Chill`,Icon:x}],N=Object.fromEntries(M.map(({key:e,Icon:t})=>[e,t])),A.__docgenInfo={description:``,methods:[],displayName:`GroupIcon`,props:{iconKey:{required:!0,tsType:{name:`string`},description:``},className:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'w-8 h-8'`,computed:!1}}}}})),F,I,L,R,z,B,V;e((()=>{F=t(),P(),I={title:`Components/GroupIcon`,component:A,tags:[`autodocs`],parameters:{layout:`centered`},argTypes:{iconKey:{control:`select`,options:M.map(e=>e.key)}}},L={args:{iconKey:`gamepad`,className:`w-8 h-8`}},R={args:{iconKey:`trophy`,className:`w-8 h-8`}},z={args:{iconKey:`crown`,className:`w-16 h-16`}},B={render:()=>(0,F.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:16},children:M.map(({key:e,label:t,Icon:n})=>(0,F.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`,gap:4,width:56},children:[(0,F.jsx)(A,{iconKey:e,className:`w-8 h-8`}),(0,F.jsx)(`span`,{style:{fontSize:10,color:`#aaa`},children:t})]},e))})},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
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