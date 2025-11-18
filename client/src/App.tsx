import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Manage from "./pages/Manage";
import Users from "./pages/Users";
import Files from "./pages/Files";
import CalendarView from "./pages/Calendar";
import AIAnalysis from "./pages/AIAnalysis";
import QuestionBank from "./pages/QuestionBank";
import CategoryManagement from "./pages/CategoryManagement";
import TagManagement from "./pages/TagManagement";
import AnalysisHistory from "./pages/AnalysisHistory";
import ExamManagement from "./pages/ExamManagement";
import ExamTake from "./pages/ExamTake";
import MyExams from "./pages/MyExams";
import ExamResult from "./pages/ExamResult";
import ExamStatistics from "./pages/ExamStatistics";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/manage"} component={Manage} />
      <Route path={"/users"} component={Users} />
      <Route path={"/files"} component={Files} />
      <Route path={"/calendar"} component={CalendarView} />
      <Route path={"/ai-analysis"} component={AIAnalysis} />
      <Route path={"/question-bank"} component={QuestionBank} />
      <Route path={"/categories"} component={CategoryManagement} />
      <Route path={"/tags"} component={TagManagement} />
      <Route path={"/analysis-history"} component={AnalysisHistory} />
      <Route path={"/exams"} component={ExamManagement} />
      <Route path={"/my-exams"} component={MyExams} />
      <Route path={"/exam/:id/take"} component={ExamTake} />
      <Route path={"/exam/:assignmentId/result"} component={ExamResult} />
      <Route path={"/exam/:id/statistics"} component={ExamStatistics} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
