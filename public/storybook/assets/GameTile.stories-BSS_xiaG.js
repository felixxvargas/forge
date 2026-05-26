import{i as e}from"./preload-helper-DID7B_--.js";import{A as t}from"./iframe-CaSO_SX-.js";import{en as n,t as r}from"./lucide-react-BR5-25y8.js";function i({game:e,postCount:t=0,showPostCount:r=!1,onClick:i}){let o=e.artwork?.find(e=>e.artwork_type===`cover`)?.url??e.artwork?.[0]?.url??e.coverArt;return(0,a.jsxs)(`div`,{className:`group cursor-pointer relative hover:z-10 hover:bg-secondary/40 rounded-lg transition-colors duration-200`,onClick:i,children:[(0,a.jsxs)(`div`,{className:`relative aspect-[3/4] rounded-lg mb-2 bg-muted/20`,children:[o&&(0,a.jsx)(`img`,{src:o,alt:e.title,className:`w-full h-full object-cover rounded-lg transition-transform duration-300 ease-out group-hover:scale-[1.06]`,style:{opacity:0,transition:`opacity 0.25s ease, transform 0.3s ease-out`},onLoad:e=>{e.currentTarget.style.opacity=`1`}}),!o&&(0,a.jsx)(`div`,{className:`w-full h-full rounded-lg flex items-center justify-center text-muted-foreground/30`,children:(0,a.jsxs)(`svg`,{className:`w-8 h-8`,fill:`none`,viewBox:`0 0 24 24`,stroke:`currentColor`,children:[(0,a.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:1.5,d:`M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z`}),(0,a.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:1.5,d:`M21 12a9 9 0 11-18 0 9 9 0 0118 0z`})]})}),r&&t>0&&(0,a.jsxs)(`div`,{className:`absolute top-1.5 left-1.5 bg-accent/80 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5`,children:[(0,a.jsx)(n,{className:`w-2.5 h-2.5`}),t]})]}),(0,a.jsx)(`h3`,{className:`text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors`,children:e.title}),e.year&&(0,a.jsx)(`p`,{className:`text-xs text-muted-foreground mt-1`,children:e.year})]})}var a,o=e((()=>{a=t(),r(),i.__docgenInfo={description:``,methods:[],displayName:`GameTile`,props:{game:{required:!0,tsType:{name:`any`},description:``},postCount:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`0`,computed:!1}},showPostCount:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},onClick:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),s,c,l,u,d,f,p,m,h,g,_,v,y;e((()=>{s=t(),o(),c={id:`1942`,title:`Elden Ring`,year:2022,artwork:[{artwork_type:`cover`,url:`https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg`}]},l={id:`119388`,title:`The Legend of Zelda: Tears of the Kingdom`,year:2023,artwork:[{artwork_type:`cover`,url:`https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg`}]},u={id:`9999`,title:`Unknown Game`,year:2024,artwork:[]},d={title:`Components/GameTile`,component:i,tags:[`autodocs`],parameters:{design:{type:`figma`,url:`https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge-Global-Design-System?node-id=306-338`},layout:`padded`},decorators:[e=>(0,s.jsx)(`div`,{style:{width:160},children:(0,s.jsx)(e,{})})]},f={args:{game:c,postCount:7,showPostCount:!0,onClick:()=>alert(`Navigate to game`)}},p={args:{game:c,postCount:0,showPostCount:!1,onClick:()=>alert(`Navigate to game`)}},m={args:{game:c,postCount:7,showPostCount:!0,onClick:()=>alert(`Navigate to game`)}},h={args:{game:c,postCount:42,showPostCount:!0,onClick:()=>alert(`Navigate to game`)}},g={args:{game:l,postCount:3,showPostCount:!0,onClick:()=>alert(`Navigate to game`)}},_={args:{game:u,postCount:0,showPostCount:!1,onClick:()=>alert(`Navigate to game`)}},v={decorators:[e=>(0,s.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(4, 160px)`,gap:16},children:[c,l,c,l].map((e,t)=>(0,s.jsx)(i,{game:{...e,id:String(t)},postCount:t*3,showPostCount:!0,onClick:()=>{}},t))})],args:{game:c,onClick:()=>{}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 7,
    showPostCount: true,
    onClick: () => alert('Navigate to game')
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 0,
    showPostCount: false,
    onClick: () => alert('Navigate to game')
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 7,
    showPostCount: true,
    onClick: () => alert('Navigate to game')
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 42,
    showPostCount: true,
    onClick: () => alert('Navigate to game')
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    game: longTitleGame,
    postCount: 3,
    showPostCount: true,
    onClick: () => alert('Navigate to game')
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    game: noArtGame,
    postCount: 0,
    showPostCount: false,
    onClick: () => alert('Navigate to game')
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 160px)',
    gap: 16
  }}>\r
        {[exampleGame, longTitleGame, exampleGame, longTitleGame].map((g, i) => <GameTile key={i} game={{
      ...g,
      id: String(i)
    }} postCount={i * 3} showPostCount={true} onClick={() => {}} />)}\r
      </div>],
  args: {
    game: exampleGame,
    onClick: () => {}
  }
}`,...v.parameters?.docs?.source}}},y=[`Default`,`NoChip`,`WithBadge`,`HighScore`,`LongTitle`,`NoArtwork`,`GridPreview`]}))();export{f as Default,v as GridPreview,h as HighScore,g as LongTitle,_ as NoArtwork,p as NoChip,m as WithBadge,y as __namedExportsOrder,d as default};