import express from 'express';
import cors from 'cors' ;//npm install cors. This was installed to be able to connect to the front end
import fs from 'fs' ;//File System that lets code interact with files on your pc
import dexcomRouter  from "./dexcom.js";
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000; //This will port to local 3000, but process.env.PORT will check if there is an environment variable called PORT on the machine running the code

//This is middleware, code that runs in between requests and actual route handlers like app.get, app.post, etc.
app.use(cors());
app.use(express.json()); //Allows Express parse JSON request bodies

app.use(dexcomRouter);

//In-memory "database". TODO: Hopefully make this into an SQL/noSQL format
const FOOD_DATA = './foodData.json';
const FOOD_TEMPLATE = './foodData.example.json';

// On a fresh clone, create foodData.json from the template
if (!fs.existsSync(FOOD_DATA)) {
    fs.copyFileSync(FOOD_TEMPLATE, FOOD_DATA);
}

function readFoods(){
    const data = fs.readFileSync(FOOD_DATA,'utf8');
    return JSON.parse(data);
}

function writeFoods(foods){
    fs.writeFileSync(FOOD_DATA, JSON.stringify(foods, null, 2));
}

/*GET all foods
Using the GET html command, we are using this command under the path /api/foods into the handler function of (req, res).
In this case, since we are using this for a get all, we most likely won't need the req. Inside, we have res.json(foods);
where it takes our foods array and converts it into JSON, sending it back as a HTTP response and sets the Content-Type
to application/json. This is how the browser/slient can know hot to interpret is as a JSON package rather than a plain text
*/
app.get('/api/foods',
    (req, res) => {
    const foods = readFoods();
    res.json(foods);
});

/*GET on food by id

*/
app.get('/api/foods/:id',
    (req, res) => {
    const foods = readFoods();
    const food = foods.find(f => f.id === parseInt(req.params.id));
    if (!food) {return res.status(404).json({error: 'Food not Found'});}
    res.json(food);
})

//POST a new food
app.post('/api/foods', (req, res) => {
    const foods = readFoods();
    const newFood = {id: foods.length +1, ...req.body};
    foods.push(newFood);
    writeFoods(foods);
    res.status(201).json(newFood);
})

//PUT update a food
app.put('/api/foods/:id', (req, res) => {
    const foods = readFoods();
    const food = foods.find(f => f.id === parseInt(req.params.id));
    if(!food) return res.status(404).json({error: 'Food not Found'});
    Object.assign(food, req.body);
    writeFoods(foods);
    res.json(food)
})

//DELETE a food
app.delete('/api/foods/:id', (req, res) => {
    let foods = readFoods();
    foods = foods.filter(f => f.id !== parseInt(req.params.id));
    writeFoods(foods);
    res.status(204).send();
})

app.listen(PORT, () => {
    console.log(`Server on port ${PORT} at http://localhost:${PORT}`);
})

const MEAL_DATA = './mealData.json';

function readMeals(){
    if(!fs.existsSync(MEAL_DATA)){return [];}
    return JSON.parse(fs.readFileSync(MEAL_DATA, 'utf8'));
}

function writeMeals(meals){
    fs.writeFileSync(MEAL_DATA, JSON.stringify(meals, null, 2));
}

app.get('/api/meals', (req, res) => {
    res.json(readMeals());
});

app.post('/api/meals', (req, res) => {
    const {name, calories, carbs, time} = req.body;
    if(!name || time == null){
        return res.status(400).json({error: 'Name or calories is required'});
    }

    const meals = readMeals();
    const newMeal = {id: Date.now(), name, calories, carbs, time};
    meals.push(newMeal);
    writeMeals(meals);
    res.status(201).json(newMeal);
});

app.delete('/api/meals/:id', (req, res) => {
    const meals = readMeals().filter(m => m.id !== parseInt(req.params.id));
    writeMeals(meals);
    res.status(204).send();
});