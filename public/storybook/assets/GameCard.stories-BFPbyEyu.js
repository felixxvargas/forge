import{i as e}from"./preload-helper-DID7B_--.js";import{A as t}from"./iframe-CV7t8WLz.js";import{n,t as r}from"./GameCard-jLRYeizH.js";var i,a,o,s,c,l,u,d,f,p,m;e((()=>{i=t(),n(),a={id:`119133`,title:`Elden Ring`,platform:`steam`,year:2022,coverArt:`https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg`},o={id:`119388`,title:`Baldur's Gate 3`,platform:`steam`,year:2023,coverArt:`https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg`},s={id:`119999`,title:`The Legend of Zelda: Tears of the Kingdom`,platform:`nintendo`,year:2023,coverArt:`https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg`},c={title:`Components/GameCard`,component:r,tags:[`autodocs`],parameters:{layout:`centered`},decorators:[e=>(0,i.jsx)(`div`,{style:{width:160},children:(0,i.jsx)(e,{})})]},l={args:{game:a}},u={args:{game:a,showHours:!0}},d={args:{game:s}},f={decorators:[e=>(0,i.jsx)(`div`,{style:{width:320},children:(0,i.jsx)(e,{})})],args:{game:o,fullWidth:!0}},p={decorators:[e=>(0,i.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(3, 160px)`,gap:16},children:[a,o,s].map(e=>(0,i.jsx)(r,{game:e},e.id))})],args:{game:a}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    game: eldenRing
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    game: eldenRing,
    showHours: true
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    game: longTitle
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    width: 320
  }}><Story /></div>],
  args: {
    game: baldursGate,
    fullWidth: true
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 160px)',
    gap: 16
  }}>\r
        {[eldenRing, baldursGate, longTitle].map(g => <GameCard key={g.id} game={g} />)}\r
      </div>],
  args: {
    game: eldenRing
  }
}`,...p.parameters?.docs?.source}}},m=[`Default`,`WithHours`,`LongTitle`,`FullWidth`,`GridPreview`]}))();export{l as Default,f as FullWidth,p as GridPreview,d as LongTitle,u as WithHours,m as __namedExportsOrder,c as default};