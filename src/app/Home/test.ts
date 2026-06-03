interface User {
  username: string;
  id: number;
}

const user: User = {
  username: "Alice",
  id: 1,
};

printUser(user);
function printUser(user: User) {
    throw new Error("Function not implemented.");
}


const users: User = {
  username: "sid",
  id: 2,
};