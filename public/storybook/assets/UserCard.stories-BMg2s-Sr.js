import{i as e}from"./preload-helper-DID7B_--.js";import{A as t,n,t as r}from"./iframe-CaSO_SX-.js";import{i,n as a}from"./router-CzdRFWgm.js";import{n as o,t as s}from"./ProfileAvatar-iRoOZdhI.js";import{n as c,t as l}from"./FollowButton-CZ_OE1jS.js";import{n as u,t as d}from"./PlatformIcon-KD2KpCu6.js";import{n as f,t as p}from"./profilePath-B_h7shif.js";import{i as m,n as h,r as g,t as _}from"./useBlueskyData-BaxyFg1p.js";function v({user:e}){let t=i(),{currentUser:r,followingIds:a}=n(),o=e.account_type===`topic`,c=h(e),u=(o?c.avatar:void 0)||e.profile_picture||e.profilePicture;return e.id===r?.id?null:(0,y.jsxs)(`div`,{className:`bg-card rounded-xl p-4 cursor-pointer hover:bg-secondary/40 transition-colors duration-200`,onClick:n=>{n.target.closest(`button`)||t(f(e))},children:[(0,y.jsxs)(`div`,{className:`flex items-start gap-3 mb-3`,children:[(0,y.jsx)(s,{username:e.display_name||e.displayName||e.handle||`?`,profilePicture:u,size:`md`,userId:e.id}),(0,y.jsxs)(`div`,{className:`flex-1 min-w-0`,children:[(0,y.jsx)(`div`,{className:`flex items-center gap-1.5 mb-1 flex-wrap`,children:(0,y.jsx)(`h3`,{className:`font-medium`,children:e.display_name||e.displayName||e.handle})}),(0,y.jsxs)(`p`,{className:`text-sm text-muted-foreground mb-1`,children:[`@`,(e.handle||``).replace(/^@/,``)]}),e.pronouns&&(0,y.jsx)(`span`,{className:`inline-block px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground`,children:e.pronouns})]})]}),(0,y.jsx)(`p`,{className:`text-sm mb-3 line-clamp-2`,children:e.bio}),(0,y.jsx)(`div`,{className:`flex flex-wrap gap-2 mb-3`,children:(e.platforms||[]).slice(0,6).map(e=>(0,y.jsx)(d,{platform:e},e))}),(0,y.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,y.jsxs)(`span`,{className:`text-sm text-muted-foreground`,children:[g(e.follower_count??e.followerCount??0),` followers`]}),(0,y.jsx)(l,{userId:e.id,initialFollowingState:a?.has(e.id)??!1,size:`sm`})]})]})}var y,b=e((()=>{y=t(),a(),o(),p(),u(),c(),m(),r(),_(),v.__docgenInfo={description:``,methods:[],displayName:`UserCard`,props:{user:{required:!0,tsType:{name:`User`},description:``}}}})),x,S,C,w,T,E,D,O;e((()=>{x=t(),b(),S={id:`user-123`,handle:`testuser`,displayName:`Test User`,display_name:`Test User`,bio:`Passionate gamer and streamer. Love RPGs and strategy games.`,profilePicture:`https://api.dicebear.com/7.x/bottts/svg?seed=forge`,profile_picture:`https://api.dicebear.com/7.x/bottts/svg?seed=forge`,platforms:[`steam`,`nintendo`],socialPlatforms:[`bluesky`],followerCount:234,followingCount:89,gameLists:{recentlyPlayed:[],library:[],favorites:[],wishlist:[]}},C={...S,id:`user-456`,handle:`anonymousgamer`,displayName:`Anonymous Gamer`,display_name:`Anonymous Gamer`,profilePicture:``,profile_picture:``,bio:`Just here to play games.`},w={title:`Components/UserCard`,component:v,tags:[`autodocs`],parameters:{layout:`padded`}},T={args:{user:S}},E={args:{user:C}},D={render:()=>(0,x.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(2, 1fr)`,gap:12},children:[(0,x.jsx)(v,{user:S}),(0,x.jsx)(v,{user:C}),(0,x.jsx)(v,{user:{...S,id:`u3`,handle:`raidleader`,display_name:`Raid Leader`,followerCount:1204}}),(0,x.jsx)(v,{user:{...S,id:`u4`,handle:`casual_gamer`,display_name:`Casual Gamer`,followerCount:12}})]})},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    user: mockUser as any
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    user: noAvatarUser as any
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12
  }}>\r
      <UserCard user={mockUser as any} />\r
      <UserCard user={noAvatarUser as any} />\r
      <UserCard user={{
      ...mockUser,
      id: 'u3',
      handle: 'raidleader',
      display_name: 'Raid Leader',
      followerCount: 1204
    } as any} />\r
      <UserCard user={{
      ...mockUser,
      id: 'u4',
      handle: 'casual_gamer',
      display_name: 'Casual Gamer',
      followerCount: 12
    } as any} />\r
    </div>
}`,...D.parameters?.docs?.source}}},O=[`Default`,`NoAvatar`,`GridPreview`]}))();export{T as Default,D as GridPreview,E as NoAvatar,O as __namedExportsOrder,w as default};