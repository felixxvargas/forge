import { createBrowserRouter } from 'react-router';
import { trackPageView } from './utils/analytics';
import { Feed } from './pages/Feed';
import { Explore } from './pages/Explore';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { ListView } from './pages/ListView';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { AuthCallback } from './pages/AuthCallback';
import { Notifications } from './pages/Notifications';
import { PostDetail } from './pages/PostDetail';
import { GamingPlatforms } from './pages/GamingPlatforms';
import { SocialMediaIntegrations } from './pages/SocialMediaIntegrations';
import { SocialMediaFiltering } from './pages/SocialMediaFiltering';
import { Messages } from './pages/Messages';
import { CommunityDetail } from './pages/CommunityDetail';
import { CommunityMembers } from './pages/CommunityMembers';
import { UserCommunities } from './pages/UserCommunities';
import { GameDetail } from './pages/GameDetail';
import { GamePlayers } from './pages/GamePlayers';
import { GameLists } from './pages/GameLists';
import { EditProfile } from './pages/EditProfile';
import { NewPost } from './pages/NewPost';
import { SubmitIndieGame } from './pages/SubmitIndieGame';
import { ReviewSubmissions } from './pages/ReviewSubmissions';
import { FollowersList } from './pages/FollowersList';
import { FollowingList } from './pages/FollowingList';
import { CreateGroup } from './pages/CreateGroup';
import { Premium } from './pages/Premium';
import { CreateCustomList } from './pages/CreateCustomList';
import { TrendingGames } from './pages/TrendingGames';
import { Layout } from './components/Layout';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import Admin from './pages/Admin';

export const router = createBrowserRouter([
  { path: '/login',         element: <Login />,       errorElement: <ErrorBoundary /> },
  { path: '/signup',        element: <SignUp />,       errorElement: <ErrorBoundary /> },
  { path: '/auth/callback', element: <AuthCallback />, errorElement: <ErrorBoundary /> },
  { path: '/splash',        element: <Onboarding />,   errorElement: <ErrorBoundary /> },
  { path: '/onboarding',    element: <Onboarding />,   errorElement: <ErrorBoundary /> },
  { path: '/admin',         element: <Admin />,        errorElement: <ErrorBoundary /> },
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
      { path: 'edit-profile',           element: <EditProfile />,             errorElement: <ErrorBoundary /> },
      { path: 'new-post',               element: <NewPost />,                 errorElement: <ErrorBoundary /> },
      { path: 'settings',               element: <Settings />,                errorElement: <ErrorBoundary /> },
      { path: 'notifications',          element: <Notifications />,           errorElement: <ErrorBoundary /> },
      { path: 'post/:postId',           element: <PostDetail />,              errorElement: <ErrorBoundary /> },
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
