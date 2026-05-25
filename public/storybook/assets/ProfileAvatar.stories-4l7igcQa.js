import{i as e}from"./preload-helper-DID7B_--.js";import{A as t}from"./iframe-CV7t8WLz.js";import{n,t as r}from"./ProfileAvatar-B_YbfI0i.js";var i,a,o,s,c,l,u,d,f;e((()=>{i=t(),n(),a={title:`Components/ProfileAvatar`,component:r,tags:[`autodocs`],parameters:{layout:`centered`},argTypes:{size:{control:`select`,options:[`sm`,`md`,`lg`,`xl`]}}},o={args:{username:`ForgeUser`,size:`md`}},s={args:{username:`ForgeUser`,profilePicture:`https://api.dicebear.com/7.x/bottts/svg?seed=forge`,size:`md`}},c={args:{username:`TK`,size:`sm`}},l={args:{username:`GuildLeader`,size:`lg`}},u={args:{username:`ProGamer99`,size:`xl`}},d={render:()=>(0,i.jsx)(`div`,{style:{display:`flex`,alignItems:`center`,gap:16},children:[`sm`,`md`,`lg`,`xl`].map(e=>(0,i.jsx)(r,{username:`Forge`,size:e},e))})},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    username: 'ForgeUser',
    size: 'md'
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    username: 'ForgeUser',
    profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
    size: 'md'
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    username: 'TK',
    size: 'sm'
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    username: 'GuildLeader',
    size: 'lg'
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    username: 'ProGamer99',
    size: 'xl'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 16
  }}>\r
      {(['sm', 'md', 'lg', 'xl'] as const).map(size => <ProfileAvatar key={size} username="Forge" size={size} />)}\r
    </div>
}`,...d.parameters?.docs?.source}}},f=[`InitialsOnly`,`WithAvatar`,`Small`,`Large`,`ExtraLarge`,`AllSizes`]}))();export{d as AllSizes,u as ExtraLarge,o as InitialsOnly,l as Large,c as Small,s as WithAvatar,f as __namedExportsOrder,a as default};