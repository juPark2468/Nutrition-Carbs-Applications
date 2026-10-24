import {useState, useEffect, useRef} from 'react'
import {LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceDot} from 'recharts'

const API = 'http://localhost:3000';

function GlucoseChart(){
    const[readings, setReadings] = useState([]);
    const [meals, setMeals] = useState([]);
    const[foods, setFoods] = useState([]);
    const[selectedTime, setSelectedTime] = useState(null);
    const[selectedFoodId, setSelectedFoodId] = useState('');
    const[error, setError] = useState(null);
    const [level, setLevel] = useState(0);        // index into ZOOM_LEVELS
    const [viewEnd, setViewEnd] = useState(null); // right edge of the window; null = latest reading

    const MIN = 60 * 1000;
    const HOUR = 60 * MIN;

    const dotClickedRef = useRef(false);

    const ZOOM_LEVELS = [
        { label: '24 h', span: 24 * HOUR, tickStep: HOUR },       // widest: a tick every hour
        { label: '6 h',  span: 6 * HOUR,  tickStep: 30 * MIN },   // in between: every 30 minutes
        { label: '1 h',  span: 1 * HOUR,  tickStep: 5 * MIN },    // closest: every 5 minutes
    ];

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

    const handleDotClick = (time) =>{
        dotClickedRef.current = true;
        setTimeout(()=>{dotClickedRef.current = false}, 0);
        setSelectedTime(time);
    };

    const handleChartClick = (state) => {
        if (dotClickedRef.current) return;               // a dot was just clicked, so skip this one
        if (state && state.activeLabel != null) {
            setSelectedTime(Number(state.activeLabel));
        }
    };

    const valueAt = new Map(readings.map(r => [r.ts, r.value]));   // time → glucose value

    const mealGroups = Object.values(
        meals.reduce((groups, m) => {
            (groups[m.time] ??= { time: m.time, items: [] }).items.push(m);
            return groups;
        }, {})
    );

    const plotted = mealGroups.filter(g => valueAt.has(g.time));

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

    const dataMin = readings[0].ts;
    const dataMax = readings[readings.length - 1].ts;

    const { span, tickStep } = ZOOM_LEVELS[level];

// keep the window inside the data we actually have
    const clampEnd = (e, s) => Math.min(Math.max(e, Math.min(dataMin + s, dataMax)), dataMax);

    const end = clampEnd(viewEnd ?? dataMax, span);
    const start = end - span;

    const visible = readings.filter(r => r.ts >= start && r.ts <= end);

// ticks count back from the latest reading, so they stay put while you pan
    const ticks = [];
    for (let t = dataMax - Math.floor((dataMax - start) / tickStep) * tickStep; t <= end; t += tickStep) {
        ticks.push(t);
    }

    const setZoom = (i) => {
        const center = end - span / 2;            // zoom around the middle of what you see now
        const newSpan = ZOOM_LEVELS[i].span;
        setLevel(i);
        setViewEnd(clampEnd(center + newSpan / 2, newSpan));
    };

    const pan = (dir) => setViewEnd(clampEnd(end + dir * span / 2, span));  // shift half a window

    const mealsAtSelected = meals.filter(m=>m.time === selectedTime);

    return(
        <div>
            <h2>Glucose</h2>
            <div>
                {ZOOM_LEVELS.map((z, i) => (
                    <button key={z.label} onClick={() => setZoom(i)} disabled={i === level}>{z.label}</button>
                ))}
                <button onClick={() => setZoom(level + 1)} disabled={level === ZOOM_LEVELS.length - 1}>Zoom in</button>
                <button onClick={() => setZoom(level - 1)} disabled={level === 0}>Zoom out</button>
                <button onClick={() => pan(-1)} disabled={end <= Math.min(dataMin + span, dataMax)}>◀</button>
                <button onClick={() => pan(1)} disabled={end >= dataMax}>▶</button>
            </div>
            <ResponsiveContainer width ="100%" height={300}>
                <LineChart data={visible} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray ="3 3"/>
                    <XAxis dataKey = "ts" type = "number" scale="time" domain={[start, end]} allowDataOverflow ticks = {ticks} interval ={0} tick = {{fontSize:11}} tickFormatter={ t => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}/>
                    <YAxis domain = {[40, 400]} unit = " mg/dL" width = {80}/>
                    <Tooltip labelFormatter = {t => new Date(t).toLocaleString()}/>
                    <Line type = "monotone" dataKey = "value" stroke = "#8884d8" dot={level === ZOOM_LEVELS.length-1} isAnimationActive={false}/>
                    {plotted.map(g => (
                        <ReferenceLine
                            key={`line-${g.time}`}
                            x={g.time}
                            stroke="orange"
                            strokeDasharray="4 4"
                            strokeOpacity={0.6}
                        />
                    ))}

                    {plotted.map(g => (
                        <ReferenceDot
                            key={`dot-${g.time}`}
                            x={g.time}
                            y={valueAt.get(g.time)}
                            r={8}
                            fill="orange"
                            stroke="white"
                            strokeWidth={2}
                            isFront
                            onClick={() => handleDotClick(g.time)}
                            style={{ cursor: 'pointer' }}
                            label={g.items.length > 1
                                ? { value: g.items.length, position: 'top', fontSize: 11 }
                                : undefined}
                        />
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