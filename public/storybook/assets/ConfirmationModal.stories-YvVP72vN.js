import{i as e}from"./preload-helper-DID7B_--.js";import{A as t}from"./iframe-iQ42XZWP.js";import{O as n,t as r}from"./lucide-react-ekrCascR.js";function i({isOpen:e,onClose:t,onConfirm:r,title:i,message:o,confirmText:s=`Confirm`,cancelText:c=`Cancel`,variant:l=`warning`}){return e?(0,a.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4`,onClick:t,children:(0,a.jsxs)(`div`,{className:`bg-card rounded-2xl p-6 max-w-md w-full shadow-xl`,onClick:e=>e.stopPropagation(),children:[(0,a.jsx)(`div`,{className:`w-12 h-12 rounded-full ${{danger:`bg-red-500/10 border-red-500/20 text-red-500`,warning:`bg-yellow-500/10 border-yellow-500/20 text-yellow-500`,info:`bg-accent/10 border-accent/20 text-accent`}[l]} flex items-center justify-center mb-4`,children:(0,a.jsx)(n,{className:`w-6 h-6`})}),(0,a.jsx)(`h2`,{className:`text-xl font-semibold mb-2`,children:i}),(0,a.jsx)(`p`,{className:`text-muted-foreground mb-6`,children:o}),(0,a.jsxs)(`div`,{className:`flex gap-3`,children:[(0,a.jsx)(`button`,{onClick:t,className:`flex-1 px-4 py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium`,children:c}),(0,a.jsx)(`button`,{onClick:()=>{r(),t()},className:`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium ${{danger:`bg-red-500 hover:bg-red-600 text-white`,warning:`bg-yellow-500 hover:bg-yellow-600 text-white`,info:`bg-accent hover:bg-accent/90 text-accent-foreground`}[l]}`,children:s})]})]})}):null}var a,o=e((()=>{a=t(),r(),i.__docgenInfo={description:``,methods:[],displayName:`ConfirmationModal`,props:{isOpen:{required:!0,tsType:{name:`boolean`},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onConfirm:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},title:{required:!0,tsType:{name:`string`},description:``},message:{required:!0,tsType:{name:`string`},description:``},confirmText:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'Confirm'`,computed:!1}},cancelText:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'Cancel'`,computed:!1}},variant:{required:!1,tsType:{name:`union`,raw:`'danger' | 'warning' | 'info'`,elements:[{name:`literal`,value:`'danger'`},{name:`literal`,value:`'warning'`},{name:`literal`,value:`'info'`}]},description:``,defaultValue:{value:`'warning'`,computed:!1}}}}})),s,c,l,u,d,f;e((()=>{o(),s={title:`Components/ConfirmationModal`,component:i,tags:[`autodocs`],parameters:{layout:`centered`},args:{isOpen:!0,onClose:()=>{},onConfirm:()=>{},title:`Confirm Action`,message:`Are you sure you want to continue? This will apply your changes.`}},c={args:{variant:`info`,title:`Save Changes`,message:`Your profile will be updated with the new information.`}},l={args:{variant:`warning`,title:`Remove Game`,message:`This will remove Elden Ring from your library. You can re-add it any time.`,confirmText:`Remove`,cancelText:`Keep`}},u={args:{variant:`danger`,title:`Delete Account`,message:`This will permanently delete your Forge account and all your posts, lists, and data. This cannot be undone.`,confirmText:`Delete Forever`,cancelText:`Keep My Account`}},d={args:{isOpen:!1}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'info',
    title: 'Save Changes',
    message: 'Your profile will be updated with the new information.'
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'warning',
    title: 'Remove Game',
    message: 'This will remove Elden Ring from your library. You can re-add it any time.',
    confirmText: 'Remove',
    cancelText: 'Keep'
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'danger',
    title: 'Delete Account',
    message: 'This will permanently delete your Forge account and all your posts, lists, and data. This cannot be undone.',
    confirmText: 'Delete Forever',
    cancelText: 'Keep My Account'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: false
  }
}`,...d.parameters?.docs?.source}}},f=[`Info`,`Warning`,`Danger`,`Closed`]}))();export{d as Closed,u as Danger,c as Info,l as Warning,f as __namedExportsOrder,s as default};