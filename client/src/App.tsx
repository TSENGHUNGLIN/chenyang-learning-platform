import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import QuestionBanks from "@/pages/QuestionBanks";
import QuestionBankDetail from "@/pages/QuestionBankDetail";
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
import ExamList from "./pages/ExamList";
import ExamTake from "./pages/ExamTake";
import MyExams from "./pages/MyExams";
import ExamResult from "./pages/ExamResult";
import ExamStatistics from "./pages/ExamStatistics";
import ManualGrading from "./pages/ManualGrading";
import ExamDetail from "./pages/ExamDetail";
import ExamTemplates from "./pages/ExamTemplates";
import QuestionRecycleBin from "./pages/QuestionRecycleBin";
import ExamMonitoring from "./pages/ExamMonitoring";
import ExamAnalytics from "./pages/ExamAnalytics";
import WrongQuestionBook from "./pages/WrongQuestionBook";
import PerformanceTrend from "./pages/PerformanceTrend";
import MakeupExamManagement from "./pages/MakeupExamManagement";
import LearningRecommendations from "./pages/LearningRecommendations";
import MakeupExamDashboard from "./pages/MakeupExamDashboard";
import DataQualityCheck from "./pages/DataQualityCheck";
import ExamPlanning from "./pages/ExamPlanning";
import OverdueExams from "./pages/OverdueExams";
import ExamRecycleBin from "./pages/ExamRecycleBin";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
       <Route path={"/"} component={Home} />
      <Route path={"/question-banks"} component={QuestionBanks} />
      <Route path={"/question-banks/:id"} component={QuestionBankDetail} />
      <Route path={"/404"} component={NotFound} />
      <Route path={"/users"} component={Users} />
      <Route path={"/files"} component={Files} />
      <Route path={"/calendar"} component={CalendarView} />
      <Route path={"/ai-analysis"} component={AIAnalysis} />
      <Route path={"/question-bank"} component={QuestionBank} />
      <Route path={"/recycle-bin"} component={QuestionRecycleBin} />
      <Route path={"/categories"} component={CategoryManagement} />
      <Route path={"/tags"} component={TagManagement} />
      <Route path={"/analysis-history"} component={AnalysisHistory} />
      <Route path={"/exam-management"} component={ExamManagement} />
      <Route path={"/exams"} component={ExamManagement} />
      <Route path={"/exams/list"} component={ExamList} />
      <Route path={"/exams/:id"} component={ExamDetail} />
      <Route path={"/exam-templates"} component={ExamTemplates} />
      <Route path={"/my-exams"} component={MyExams} />
      <Route path={"/exam/:assignmentId/take"} component={ExamTake} />
      <Route path={"/exam/:assignmentId/result"} component={ExamResult} />
      <Route path={"/exam/:id/statistics"} component={ExamStatistics} />
      <Route path={"/exam/:examId/analytics"} component={ExamAnalytics} />
      <Route path={"/exam/:assignmentId/grade"} component={ManualGrading} />
      <Route path={"/exam-monitoring"} component={ExamMonitoring} />
      <Route path={"/wrong-questions"} component={WrongQuestionBook} />
      <Route path={"/performance-trend"} component={PerformanceTrend} />
      <Route path={"/makeup-exams"} component={MakeupExamManagement} />
      <Route path={"/makeup-dashboard"} component={MakeupExamDashboard} />
      <Route path={"/learning-recommendations"} component={LearningRecommendations} />
      <Route path={"/data-quality"} component={DataQualityCheck} />
      <Route path={"/exam-planning"} component={ExamPlanning} />
      <Route path={"/overdue-exams"} component={OverdueExams} />
      <Route path={"/exam-recycle-bin"} component={ExamRecycleBin} />
      <Route path={"/manage"} component={Manage} />
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
