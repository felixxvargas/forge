import{i as e}from"./preload-helper-DID7B_--.js";import{A as t}from"./iframe-DuOOc3vR.js";import{Qn as n,t as r}from"./lucide-react-Ci1PINIJ.js";function i({onClick:e,className:t,hasUnreadNotifications:r=!1,unreadNotificationCount:i=0}){return(0,a.jsxs)(`button`,{onClick:e,className:`group p-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-1.5 ${t??``}`,children:[(0,a.jsx)(n,{className:`w-5 h-5 text-accent`}),r&&(0,a.jsx)(`span`,{className:`flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accent text-[#3f2d5f] text-xs font-semibold rounded-full shadow-[0_0_8px_rgba(231,255,196,0.65)]`,children:i>99?`99+`:i||``})]})}var a,o=e((()=>{a=t(),r(),i.__docgenInfo={description:``,methods:[],displayName:`NotificationBell`,props:{onClick:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},className:{required:!1,tsType:{name:`string`},description:``},hasUnreadNotifications:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},unreadNotificationCount:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`0`,computed:!1}}}}})),s,c,l,u,d;e((()=>{o(),s={title:`Components/NotificationBell`,component:i,tags:[`autodocs`],parameters:{design:{type:`figma`,url:`https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge-Global-Design-System?node-id=308-338`},layout:`centered`}},c={args:{onClick:()=>alert(`Bell clicked`),hasUnreadNotifications:!1,unreadNotificationCount:0}},l={args:{onClick:()=>alert(`Bell clicked`),hasUnreadNotifications:!0,unreadNotificationCount:3}},u={args:{onClick:()=>alert(`Bell clicked`),hasUnreadNotifications:!0,unreadNotificationCount:150}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    onClick: () => alert('Bell clicked'),
    hasUnreadNotifications: false,
    unreadNotificationCount: 0
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    onClick: () => alert('Bell clicked'),
    hasUnreadNotifications: true,
    unreadNotificationCount: 3
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    onClick: () => alert('Bell clicked'),
    hasUnreadNotifications: true,
    unreadNotificationCount: 150
  }
}`,...u.parameters?.docs?.source}}},d=[`NoUnread`,`WithCount`,`HighCount`]}))();export{u as HighCount,c as NoUnread,l as WithCount,d as __namedExportsOrder,s as default};