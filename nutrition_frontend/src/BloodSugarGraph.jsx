import {useState, useEffect} from 'react'
import {LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine,} from 'recharts'

const API = 'http://localhost:3000';

function GlucoseChart(){
    const[readings, setReadings] = useState([]);
    const [meals, setMeals] = useState([]);
    const[foods, setFoods] = useState([]);
    const[selectedTime, setSelectedTime] = useState(null);
    const[selectedFoodId, setSelectedFoodId] = useState('');
    const[error, setError] = useState(null);

    useEffect(() => {
        fetch(`${API}/api/glucose`, {cache: 'no-store'})
            .then(res => {
                if(!res.ok){
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                const cleaned = (data.records ?? [])
                    .filter(r=>r.value != null)
                    .map(r=>({ts: new Date(r.displayTime).getTime(), value: r.value}))
                    .sort((a, b) => a.ts-b.ts);

                setReadings(cleaned.slice(-288));
            })
            .catch(err => setError(err.message));

        fetch(`${API}/api/meals`).then(res => res.json()).then(setMeals);
        fetch(`${API}/api/foods`).then(res => res.json()).then(setFoods)
        }, []);

    const handleChartClick = (state) =>{
        if(state && state.activeLabel != null){
            setSelectedTime(state.activeLabel);
        }
    };

    const addMeal = async() => {
        const food = foods.find(f=>f.id === parseInt(selectedFoodId));
        if(!food){return;}

        const res = await fetch(`${API}/api/meals`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: food.name, calories: food.calories, carbs: food.carbs, time: selectedTime}),
        });
        const created = await res.json();
        setMeals(prev => [...prev, created]);
        setSelectedFoodId('');
    };

    const removeMeal =async (id) =>{
      await fetch(`${API}/api/meals/${id}`, {method: 'DELETE'});
      setMeals(prev=> prev.filter(m=>m.id !==id));
    };

    if(error){return <p>Couldn't load the glucose data: {error}</p>;}
    if(readings.length === 0){return <p>No glucose data to show yet </p>;}

    const mealsAtSelected = meals.filter(m=>m.time === selectedTime);

    return(
        <div>
            <h2>Glucose</h2>
            <ResponsiveContainer width ="100%" height={300}>
                <LineChart data={readings} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray ="3 3"/>
                    <XAxis dataKey = "ts" type = "number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={ t => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}/>
                    <YAxis domain = {[40, 400]} unit = " mg/dL" width = {80}/>
                    <Tooltip labelFormatter = {t => new Date(t).toLocaleString()}/>
                    <Line type = "monotone" dataKey = "value" stroke = "#8884d8" dot={false}/>

                    {meals.map(m => (
                        <ReferenceLine key = {m.id} x={m.time} stroke={"orange"} strokeDasharray={"4 4"} label={m.name}/>
                    ))}
                </LineChart>
            </ResponsiveContainer>

            {selectedTime !== null && (
                <div
                    style ={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent:'center'}}
                    onClick ={() => setSelectedTime(null)}
                >
                    <div
                        style ={{background: 'white', color:'black', padding: '1rem',
                                borderRadius: 8, minWidth:280}}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3>{new Date(selectedTime).toLocaleString()}</h3>

                        {mealsAtSelected.length === 0 ? (
                            <p>No Food Logged Here</p>
                        ):(
                            <ul>
                            {mealsAtSelected.map(m=>(
                                <li key={m.id}>
                                    {m.name} - {m.calories} cal - {m.carbs} carbs(g)
                                    <button onClick = {() => removeMeal(m.id)}>Remove</button>
                                </li>
                                ))}
                            </ul>
                        )}
                        <select value={selectedFoodId} onChange={e=>setSelectedFoodId(e.target.value)}>
                            <option value ="">Choose a food...</option>
                            {foods.map(f=>(
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <button onClick = {addMeal}>Add</button>
                        <button onClick ={()=>setSelectedTime(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GlucoseChart