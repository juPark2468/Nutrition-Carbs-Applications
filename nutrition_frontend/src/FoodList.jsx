import { useState, useEffect } from 'react';

function FoodList() {
    const [foods, setFoods] = useState([]);
    const [name , setName] = useState('');
    const [calories , setCalories] = useState('');
    const [carbs , setCarbs] = useState('');

    useEffect(() => { //Without this, the fetch would run infinitely. Second argument says for it to run under certain conditions. [] means to rune once only after the first render
        fetchFoods();
    }, []);

    const fetchFoods = () => {
        fetch('http://localhost:3000/api/foods')
            .then(res => res.json())
            .then(data => setFoods(data))
            .catch(err => console.error('Error fetching foods:', err));
    };

    const handleDelete = async (id) => {
        await fetch(`http://localhost:3000/api/foods/${id}`, {
            method: 'DELETE',
        });//this should be the real database deleting it
      setFoods(prevFoods => prevFoods.filter(food => food.id !== id)); //This is the front ends copy of the database
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const newData = {name, calories: parseInt(calories), carbs: parseInt(carbs)};

        const res = await fetch(`http://localhost:3000/api/foods`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newData)
        });
        const createdFood = await res.json();
        setFoods(prev => [...prev, createdFood]);
        setName('');
        setCalories('');
        setCarbs('');
    };
//note, () => inside of button onClick waits for it on click
    return (
        <div>
            <h2>Foods</h2>
            <ul>
                {foods.map(food => (
                    <li key={food.id}>
                        {food.name} - {food.calories} cal - {food.carbs} carbs
                        <button onClick={ () =>handleDelete(food.id)}>Delete</button>
                    </li>
                ))}
            </ul>
            <form onSubmit={onSubmit}>
                <input
                    type = "text"
                    placeholder = "Food Name"
                    value = {name}
                    onChange={(e) => {setName(e.target.value)}}
                />

                <input
                    type = "number"
                    placeholder = "Calories"
                    value = {calories}
                    onChange={(e) => {setCalories(e.target.value)}}
                />

                <input
                    type = "number"
                    placeholder = "Carbohydrates (g)"
                    value = {carbs}
                    onChange={(e) => {setCarbs(e.target.value)}}
                />
                <button type="submit">Add Food</button>
            </form>
        </div>
    );
}

export default FoodList;