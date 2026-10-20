import FoodList from './FoodList'
import bloodSugarGraph from "./BloodSugarGraph.jsx";
import GlucoseChart from "./BloodSugarGraph.jsx";
//import './App.css' //TODO: This is a want more than a need

function App() {
  return (
    <div className="App">
      <h1>Nutrition App</h1>
      <FoodList/>
      <GlucoseChart/>
    </div>
  );
}

export default App;