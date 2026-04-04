import { createBrowserRouter } from 'react-router';
import { lazy } from 'react';
import { trackPageView } from './utils/analytics';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const Feed                  = lazy(() => import('./pages/Feed').then(m => ({ default: m.Feed })));
const Explore               = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const Profile               = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings              = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Onboarding            = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const ListView              = lazy(() => import('./pages/ListView').then(m => ({ default: m.ListView })));
const Login                 = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const SignUp                = lazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const AuthCallback          = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const Notifications         = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const PostDetail            = lazy(() => import('./pages/PostDetail').then(m => ({ default: m.PostDetail })));
const GamingPlatforms       = lazy(() => import('./pages/GamingPlatforms').then(m => ({ default: m.GamingPlatforms })));
const SocialMediaIntegrations = lazy(() => import('./pages/SocialMediaIntegrations').then(m => ({ default: m.SocialMediaIntegrations })));
const SocialMediaFiltering  = lazy(() => import('./pages/SocialMediaFiltering').then(m => ({ default: m.SocialMediaFiltering })));
const Messages              = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const CommunityDetail       = lazy(() => import('./pages/CommunityDetail').then(m => ({ default: m.CommunityDetail })));
const CommunityMembers      = lazy(() => import('./pages/CommunityMembers').then(m => ({ default: m.CommunityMembers })));
const UserCommunities       = lazy(() => import('./pages/UserCommunities').then(m => ({ default: m.UserCommunities })));
const GameDetail            = lazy(() => import('./pages/GameDetail').then(m => ({ default: m.GameDetail })));
const GamePlayers           = lazy(() => import('./pages/GamePlayers').then(m => ({ default: m.GamePlayers })));
const GameLists             = lazy(() => import('./pages/GameLists').then(m => ({ default: m.GameLists })));
const EditProfile           = lazy(() => import('./pages/EditProfile').then(m => ({ default: m.EditProfile })));
const NewPost               = lazy(() => import('./pages/NewPost').then(m => ({ default: m.NewPost })));
const SubmitIndieGame       = lazy(() => import('./pages/SubmitIndieGame').then(m => ({ default: m.SubmitIndieGame })));
const ReviewSubmissions     = lazy(() => import('./pages/ReviewSubmissions').then(m => ({ default: m.ReviewSubmissions })));
const FollowersList         = lazy(() => import('./pages/FollowersList').then(m => ({ default: m.FollowersList })));
const FollowingList         = lazy(() => import('./pages/FollowingList').then(m => ({ default: m.FollowingList })));
const CreateGroup           = lazy(() => import('./pages/CreateGroup').then(m => ({ default: m.CreateGroup })));
const Premium               = lazy(() => import('./pages/Premium').then(m => ({ default: m.Premium })));
const CreateCustomList      = lazy(() => import('./pages/CreateCustomList').then(m => ({ default: m.CreateCustomList })));
const TrendingGames         = lazy(() => import('./pages/TrendingGames').then(m => ({ default: m.TrendingGames })));
const NotFound              = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const FlareDetail           = lazy(() => import('./pages/FlareDetail').then(m => ({ default: m.FlareDetail })));
const UserFlares            = lazy(() => import('./pages/UserFlares').then(m => ({ default: m.UserFlares })));
const PostInteractions      = lazy(() => import('./pages/PostInteractions').then(m => ({ default: m.PostInteractions })));
const PrivacyPolicy         = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService        = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacySettings       = lazy(() => import('./pages/PrivacySettings').then(m => ({ default: m.PrivacySettings })));
const DataDeletion          = lazy(() => import('./pages/DataDeletion').then(m => ({ default: m.DataDeletion })));
const AccountSettings       = lazy(() => import('./pages/AccountSettings').then(m => ({ default: m.AccountSettings })));
const NotificationsSettings = lazy(() => import('./pages/NotificationsSettings').then(m => ({ default: m.NotificationsSettings })));
const FeedbackPage          = lazy(() => import('./pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })));
const WhatsNewPage          = lazy(() => import('./pages/WhatsNewPage').then(m => ({ default: m.WhatsNewPage })));
const BlueskyProfilePage    = lazy(() => import('./pages/BlueskyProfilePage').then(m => ({ default: m.BlueskyProfilePage })));
const ResetPassword         = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const BlueskyCallback       = lazy(() => import('./pages/BlueskyCallback').then(m => ({ default: m.BlueskyCallback })));
const MastodonCallback      = lazy(() => import('./pages/MastodonCallback').then(m => ({ default: m.MastodonCallback })));
const SocialClaimAccount    = lazy(() => import('./pages/SocialClaimAccount').then(m => ({ default: m.SocialClaimAccount })));

export const router = createBrowserRouter([
  { path: '/login',                    element: <Login />,              errorElement: <ErrorBoundary /> },
  { path: '/reset-password',           element: <ResetPassword />,      errorElement: <ErrorBoundary /> },
  { path: '/auth/bluesky/callback',    element: <BlueskyCallback />,    errorElement: <ErrorBoundary /> },
  { path: '/auth/mastodon/callback',   element: <MastodonCallback />,   errorElement: <ErrorBoundary /> },
  { path: '/auth/social-claim',        element: <SocialClaimAccount />, errorElement: <ErrorBoundary /> },
  { path: '/signup',        element: <SignUp />,         errorElement: <ErrorBoundary /> },
  { path: '/auth/callback', element: <AuthCallback />,  errorElement: <ErrorBoundary /> },
  { path: '/privacy',         element: <PrivacyPolicy />,  errorElement: <ErrorBoundary /> },
  { path: '/terms',           element: <TermsOfService />, errorElement: <ErrorBoundary /> },
  { path: '/data-deletion',   element: <DataDeletion />,   errorElement: <ErrorBoundary /> },
  { path: '/splash',        element: <Onboarding />,   errorElement: <ErrorBoundary /> },
  { path: '/onboarding',    element: <Onboarding />,   errorElement: <ErrorBoundary /> },
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true,                    element: <Feed />,                    errorElement: <ErrorBoundary /> },
      { path: 'list',                   element: <ListView />,                errorElement: <ErrorBoundary /> },
      { path: 'feed',                   element: <Feed />,                    errorElement: <ErrorBoundary /> },
      { path: 'explore',                element: <Explore />,                 errorElement: <ErrorBoundary /> },
      { path: 'profile',                element: <Profile />,                 errorElement: <ErrorBoundary /> },
      { path: 'profile/:userId',        element: <Profile />,                 errorElement: <ErrorBoundary /> },
      { path: 'profile/handle/:handle', element: <Profile />,                 errorElement: <ErrorBoundary /> },
      { path: 'edit-profile',           element: <EditProfile />,             errorElement: <ErrorBoundary /> },
      { path: 'new-post',               element: <NewPost />,                 errorElement: <ErrorBoundary /> },
      { path: 'settings',               element: <Settings />,                errorElement: <ErrorBoundary /> },
      { path: 'notifications',          element: <Notifications />,           errorElement: <ErrorBoundary /> },
      { path: 'post/:postId',           element: <PostDetail />,              errorElement: <ErrorBoundary /> },
      { path: 'post/:postId/interactions', element: <PostInteractions />,     errorElement: <ErrorBoundary /> },
      { path: 'gaming-platforms',       element: <GamingPlatforms />,         errorElement: <ErrorBoundary /> },
      { path: 'social-integrations',    element: <SocialMediaIntegrations />, errorElement: <ErrorBoundary /> },
      { path: 'social-filtering',       element: <SocialMediaFiltering />,    errorElement: <ErrorBoundary /> },
      { path: 'messages',               element: <Messages />,                errorElement: <ErrorBoundary /> },
      { path: 'group/:groupId',         element: <CommunityDetail />,         errorElement: <ErrorBoundary /> },
      { path: 'group/:groupId/members', element: <CommunityMembers />,        errorElement: <ErrorBoundary /> },
      { path: 'user-groups',            element: <UserCommunities />,         errorElement: <ErrorBoundary /> },
      { path: 'followers',              element: <FollowersList />,           errorElement: <ErrorBoundary /> },
      { path: 'followers/:userId',      element: <FollowersList />,           errorElement: <ErrorBoundary /> },
      { path: 'following',              element: <FollowingList />,           errorElement: <ErrorBoundary /> },
      { path: 'following/:userId',      element: <FollowingList />,           errorElement: <ErrorBoundary /> },
      { path: 'game/:gameId',           element: <GameDetail />,              errorElement: <ErrorBoundary /> },
      { path: 'game/:gameId/players',   element: <GamePlayers />,             errorElement: <ErrorBoundary /> },
      { path: 'game/:gameId/lists',     element: <GameLists />,               errorElement: <ErrorBoundary /> },
      { path: 'submit-indie-game',      element: <SubmitIndieGame />,         errorElement: <ErrorBoundary /> },
      { path: 'review-submissions',     element: <ReviewSubmissions />,       errorElement: <ErrorBoundary /> },
      { path: 'create-group',           element: <CreateGroup />,             errorElement: <ErrorBoundary /> },
      { path: 'premium',               element: <Premium />,                 errorElement: <ErrorBoundary /> },
      { path: 'create-custom-list',    element: <CreateCustomList />,        errorElement: <ErrorBoundary /> },
      { path: 'trending-games',        element: <TrendingGames />,           errorElement: <ErrorBoundary /> },
      { path: 'flare/:flareId',        element: <FlareDetail />,             errorElement: <ErrorBoundary /> },
      { path: 'flares/:userId',        element: <UserFlares />,              errorElement: <ErrorBoundary /> },
      { path: 'privacy',              element: <PrivacyPolicy />,            errorElement: <ErrorBoundary /> },
      { path: 'terms',                element: <TermsOfService />,           errorElement: <ErrorBoundary /> },
      { path: 'privacy-security',     element: <PrivacySettings />,          errorElement: <ErrorBoundary /> },
      { path: 'settings/account',     element: <AccountSettings />,          errorElement: <ErrorBoundary /> },
      { path: 'settings/notifications', element: <NotificationsSettings />,   errorElement: <ErrorBoundary /> },
      { path: 'settings/feedback',    element: <FeedbackPage />,             errorElement: <ErrorBoundary /> },
      { path: 'settings/whats-new',   element: <WhatsNewPage />,             errorElement: <ErrorBoundary /> },
      { path: 'bsky/:handle',          element: <BlueskyProfilePage />,       errorElement: <ErrorBoundary /> },
      { path: ':handle',               element: <Profile />,                 errorElement: <ErrorBoundary /> },
      { path: '*',                      element: <NotFound /> },
    ],
  },
]);

// Track page views on every navigation
router.subscribe((state) => {
  if (state.navigation.state === 'idle') {
    trackPageView(state.location.pathname + state.location.search);
  }
});
