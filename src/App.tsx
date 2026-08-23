import { Route, Switch } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "@/pages/Home";
import TeensPage from "@/pages/TeensPage";
import ThirtiesPage from "@/pages/ThirtiesPage";
import FortiesPage from "@/pages/FortiesPage";
import FiftiesPage from "@/pages/FiftiesPage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/teens" component={TeensPage} />
        <Route path="/thirties" component={ThirtiesPage} />
        <Route path="/forties" component={FortiesPage} />
        <Route path="/fifties" component={FiftiesPage} />
        <Route component={Home} />
      </Switch>
    </>
  );
}
