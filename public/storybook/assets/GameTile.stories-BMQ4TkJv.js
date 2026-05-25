import{i as e,l as t}from"./preload-helper-DID7B_--.js";import{a as n,i as r,n as i,r as a}from"./iframe-B33rETbh.js";import{n as o,t as s}from"./lucide-react-BqUWZO-k.js";var c,l,u,d,f,p=e((()=>{c=t(n(),1),{fn:l}=__STORYBOOK_MODULE_TEST__,u=l().mockName(`next/link::Link`),d=c.forwardRef(function({href:e,as:t,replace:n,scroll:r,shallow:i,prefetch:a,passHref:o,legacyBehavior:s,locale:l,onClick:d,children:f,...p},m){let h=typeof e==`object`?`${e.pathname||``}${e.query?`?${new URLSearchParams(e.query).toString()}`:``}${e.hash||``}`:e,g=e=>{e.preventDefault(),d?.(e),u(h,{replace:n,scroll:r,shallow:i,prefetch:a,locale:l})};if(s){let e=c.Children.only(f),t={ref:m,onClick:t=>{t.preventDefault(),e.props&&typeof e.props.onClick==`function`&&e.props.onClick(t),u(h,{replace:n,scroll:r,shallow:i,prefetch:a,locale:l})},...p};return(o||e.type===`a`&&!(`href`in(e.props||{})))&&(t.href=h),c.cloneElement(e,t)}return c.createElement(`a`,{ref:m,href:h,onClick:g,...p},f)}),d.displayName=`NextLink`,f=d,l(()=>({pending:!1})).mockName(`next/link::useLinkStatus`)}));function m(){let e=r();return(t,n)=>{if(typeof t==`number`){e.back();return}n?.replace?e.replace(t):e.push(t)}}function h({to:e,children:t,...n}){return(0,_.jsx)(f,{href:e,...n,children:t})}function g({to:e,children:t,...n}){return(0,_.jsx)(f,{href:e,...n,children:t})}var _,v=e((()=>{_=i(),a(),p(),n(),h.__docgenInfo={description:``,methods:[],displayName:`Link`,props:{to:{required:!0,tsType:{name:`string`},description:``},children:{required:!1,tsType:{name:`ReactNode`},description:``}}},g.__docgenInfo={description:``,methods:[],displayName:`NavLink`,props:{to:{required:!0,tsType:{name:`string`},description:``},children:{required:!1,tsType:{name:`ReactNode`},description:``}}}}));function y({game:e,postCount:t=0,showPostCount:n=!1}){let r=m(),i=e.artwork?.find(e=>e.artwork_type===`cover`)?.url??e.artwork?.[0]?.url??e.coverArt;return(0,b.jsxs)(`div`,{className:`group cursor-pointer relative hover:z-10 hover:bg-secondary/40 rounded-lg transition-colors duration-200`,onClick:()=>r(`/game/${e.id}`),children:[(0,b.jsxs)(`div`,{className:`relative aspect-[3/4] rounded-lg mb-2 bg-muted/20`,children:[i&&(0,b.jsx)(`img`,{src:i,alt:e.title,className:`w-full h-full object-cover rounded-lg transition-transform duration-300 ease-out group-hover:scale-[1.06]`,style:{opacity:0,transition:`opacity 0.25s ease, transform 0.3s ease-out`},onLoad:e=>{e.currentTarget.style.opacity=`1`}}),!i&&(0,b.jsx)(`div`,{className:`w-full h-full rounded-lg flex items-center justify-center text-muted-foreground/30`,children:(0,b.jsxs)(`svg`,{className:`w-8 h-8`,fill:`none`,viewBox:`0 0 24 24`,stroke:`currentColor`,children:[(0,b.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:1.5,d:`M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z`}),(0,b.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:1.5,d:`M21 12a9 9 0 11-18 0 9 9 0 0118 0z`})]})}),n&&t>0&&(0,b.jsxs)(`div`,{className:`absolute top-1.5 left-1.5 bg-accent/80 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5`,children:[(0,b.jsx)(o,{className:`w-2.5 h-2.5`}),t]})]}),(0,b.jsx)(`h3`,{className:`text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors`,children:e.title}),e.year&&(0,b.jsx)(`p`,{className:`text-xs text-muted-foreground mt-1`,children:e.year})]})}var b,x=e((()=>{b=i(),v(),s(),y.__docgenInfo={description:``,methods:[],displayName:`GameTile`,props:{game:{required:!0,tsType:{name:`any`},description:``},postCount:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`0`,computed:!1}},showPostCount:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}})),S,C,w,T,E,D,O,k,A,j,M,N;e((()=>{S=i(),x(),C={id:`1942`,title:`Elden Ring`,year:2022,artwork:[{artwork_type:`cover`,url:`https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg`}]},w={id:`119388`,title:`The Legend of Zelda: Tears of the Kingdom`,year:2023,artwork:[{artwork_type:`cover`,url:`https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg`}]},T={id:`9999`,title:`Unknown Game`,year:2024,artwork:[]},E={title:`Components/GameTile`,component:y,tags:[`autodocs`],parameters:{design:{type:`figma`,url:`https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge-Global-Design-System?node-id=306-338`},layout:`padded`},decorators:[e=>(0,S.jsx)(`div`,{style:{width:160},children:(0,S.jsx)(e,{})})]},D={args:{game:C,postCount:0,showPostCount:!1}},O={args:{game:C,postCount:7,showPostCount:!0}},k={args:{game:C,postCount:42,showPostCount:!0}},A={args:{game:w,postCount:3,showPostCount:!0}},j={args:{game:T,postCount:0,showPostCount:!1}},M={decorators:[e=>(0,S.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(4, 160px)`,gap:16},children:[C,w,C,w].map((e,t)=>(0,S.jsx)(y,{game:{...e,id:String(t)},postCount:t*3,showPostCount:!0},t))})],args:{game:C}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 0,
    showPostCount: false
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 7,
    showPostCount: true
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    game: exampleGame,
    postCount: 42,
    showPostCount: true
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    game: longTitleGame,
    postCount: 3,
    showPostCount: true
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    game: noArtGame,
    postCount: 0,
    showPostCount: false
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 160px)',
    gap: 16
  }}>\r
        {[exampleGame, longTitleGame, exampleGame, longTitleGame].map((g, i) => <GameTile key={i} game={{
      ...g,
      id: String(i)
    }} postCount={i * 3} showPostCount={true} />)}\r
      </div>],
  args: {
    game: exampleGame
  }
}`,...M.parameters?.docs?.source}}},N=[`Default`,`WithBadge`,`HighScore`,`LongTitle`,`NoArtwork`,`GridPreview`]}))();export{D as Default,M as GridPreview,k as HighScore,A as LongTitle,j as NoArtwork,O as WithBadge,N as __namedExportsOrder,E as default};