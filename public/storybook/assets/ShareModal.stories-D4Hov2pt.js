import{i as e}from"./preload-helper-DID7B_--.js";import{n as t,t as n}from"./ShareModal-CBZvXMQ9.js";var r,i,a,o,s,c,l;e((()=>{t(),r={id:`post-1`,userId:`mock-user`,content:`Just hit 100 hours in Elden Ring. Still discovering new areas!`,platform:`forge`,timestamp:new Date,likes:24,reposts:6,comments:8},i={title:`Components/ShareModal`,component:n,tags:[`autodocs`],parameters:{layout:`fullscreen`},args:{isOpen:!0,onClose:()=>{}}},a={args:{post:r}},o={args:{user:{handle:`testuser`,display_name:`Test User`,id:`mock-user`}}},s={args:{game:{title:`Elden Ring`,id:`119133`,coverArt:`https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg`}}},c={args:{isOpen:!1}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    post: mockPost as any
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    user: {
      handle: 'testuser',
      display_name: 'Test User',
      id: 'mock-user'
    } as any
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    game: {
      title: 'Elden Ring',
      id: '119133',
      coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg'
    } as any
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: false
  }
}`,...c.parameters?.docs?.source}}},l=[`SharePost`,`ShareUser`,`ShareGame`,`Closed`]}))();export{c as Closed,s as ShareGame,a as SharePost,o as ShareUser,l as __namedExportsOrder,i as default};