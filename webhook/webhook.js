const express = require("express");
const { WebhookClient } = require("dialogflow-fulfillment");
const app = express();
const fetch = require("node-fetch");
const base64 = require("base-64");

let username = ""; // Initialized by user
let password = ""; //
let token = "";

// Hard coded since it wasn't working without it
let productids = {
  "Bucky Crew Neck Sweatshirt": 1,
  "Bucky Badger Plush": 3,
  "Wisconsin Leggings": 4,
  "Game Day Bucky Plush": 5,
  "Bucky Badger Leggings": 6,
  "W Cloud Pillow": 7,
  "Bucky Badger Pillow": 8,
  "Bucky Badger Keychain": 9,
  "Wisconsin Football Hat": 10,
  "White Wisconsin Visor": 11,
  "150 Year Commemorative Hoodie": 13,
  "Women's Wisconsin Cuddle Joggers": 14,
  "Wisconsin Sweatpants": 15,
  "Wisconsin Qualifier Woven Short": 16,
  "Wisconsin Running Shorts": 17,
};

let products = [];
let categories = [];
let tags = [];

let USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
let ENDPOINT_URL = "";
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000";
} else {
  ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu";
}

// Now user and agent chat are all in one place
async function addMessage(person, message) {
  let val = {
    "isUser": person === "agent" ? false : true,
    "text": message,
    "id": 0,
  };
  url = "https://mysqlcs639.cs.wisc.edu/application/messages/";
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    },
    body: JSON.stringify(val),
    redirect: 'follow'
  }
  const serverReturn = await fetch(url, request)
  const serverResponse = await serverReturn.json()

  // For debugging
  message = serverResponse.message;
}


// Empty messages
async function deleteChat() {
  await fetch("https://mysqlcs639.cs.wisc.edu/application/messages/", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
  });
}


// Store token on login
async function getToken() {
  let request = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + base64.encode(username + ":" + password),
    },
    redirect: "follow",
  };

  const serverReturn = await fetch("https://mysqlcs639.cs.wisc.edu/login", request);
  const serverResponse = await serverReturn.json();
  token = serverResponse.token;

  // Confirm token
  console.log("token is: " + token)
  return token;
}

app.get("/", (req, res) => res.send("online"));
app.post("/", express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  async function welcome() {
    agent.add('Webhook works!')
    console.log(ENDPOINT_URL)
  }

  // Log in by giving username and password to get a token
  async function login() {
    username = agent.parameters.username;
    password = agent.parameters.password;
    token = await getToken();
    let test = "";
    await deleteChat();
    await addMessage( "user" , agent.query);
    await fetch("https://mysqlcs639.cs.wisc.edu/application", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify({ page: "/" + username }),
    })
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
        test = resp.message;
      })
      .catch((error) => {
        console.log(error);
      });
    await addMessage( "agent" , "You are logged in as " + username);
    if (test != "Token is invalid!") {
      agent.add("You are logged in as " + username);
    } else {
      agent.add("Incorrect username or password");
    }
  }

  // User is able to request information about categories
  async function searchCategories() {
    await addMessage( "user" , agent.query);
    await fetch("https://mysqlcs639.cs.wisc.edu/categories", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((resp) => {
        categories = resp.categories;
      })
      .catch((error) => {
        console.log(error);
      });
    let message = "The categories are ";
    for (let i = 0; i < categories.length; i++) {
      if (i == 0) {
        message += categories[i] + "";
      } else if (i < categories.length - 1) {
        message += ", " + categories[i];
      }
      // Last category
      else {
        message += " and " + categories[i] + " ";
      }
    }
    agent.add(message);
    await addMessage( "agent" , message);
  }

  // Request info about tag
  async function searchTag() {
    await addMessage( "user" , agent.query);
    await fetch(
      "https://mysqlcs639.cs.wisc.edu/categories/" +
      agent.parameters.categories +
      "/tags",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
        tags = resp.tags;
      })
      .catch((error) => {
        console.log(error);
      });
    if (tags.includes(tag)) {


      let message = "The tags are ";
      for (let i = 0; i < tags.length; i++) {
        if (i == 0) {
          message += tags[i] + "";
        } else if (i < tags.length - 1) {
          message += ", " + tags[i];
        } else {
          message += " and " + tags[i] + " ";
        }
      }
      agent.add(message);
      await addMessage( "agent" , message);
    }
    else {
      agent.add("What tags do you want to filter by?");
      await addMessage( "agent" , "What tags do you want to filter by?")
    }

  }
  // Get info like ratings, reviews, and product details
  async function searchItem() {
    await addMessage( "user" , agent.query);
    let id = productids[agent.parameters.products];

    if (id !== -1) {
      let url = "https://mysqlcs639.cs.wisc.edu/products/" + id;
      let productinfo = {};
      let productreviews = {};
      await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      })
        .then((resp) => resp.json())
        .then((resp) => {
          console.log(resp);
          productinfo = resp;
        })
        .catch((error) => {
          console.log(error);
        });
      url += "/reviews/";
      await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      })
        .then((resp) => resp.json())
        .then((resp) => {
          console.log(resp);
          productreviews = resp.reviews;
        })
        .catch((error) => {
          console.log(error);
        });

      let message =
        "The " + productinfo.name + " costs $ " + productinfo.price + ". ";
      let totalStars = 0;
      for (let i = 0; i < productreviews.length; i++) {
        if (i == 0) {
          message +=
            "Here are the reviews: " +
            productreviews[i].text +
            " Rating: " +
            productreviews[i].stars;
        }
        totalStars += productreviews[i].stars;
      }
      message +=
        ". This product is rated " +
        totalStars / productreviews.length + " on average";
      agent.add(message);
      await addMessage( "agent" , message);
    } else {
      let message =
        "Whoops! I couldn't find that for you. Please try again.";
      agent.add(message);
      await addMessage( "agent" , message);
    }
  }

  // Filter by tags
  async function selectTags() {
    await addMessage( "user" , agent.query);
    let tag = agent.parameters.tag;
    await fetch("https://mysqlcs639.cs.wisc.edu/tags", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    })
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
        tags = resp.tags;
      })
      .catch((error) => {
        console.log(error);
      });

    if (tags.includes(tag)) {
      let url = "https://mysqlcs639.cs.wisc.edu/application/tags/" + tag;
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });
      let message = "Page has been filtered by: " + tag;
      agent.add(message);
      await addMessage( "agent" , message);
    } else {
      let message = "I couldn't find that tag. Please try again.";
      agent.add(message);
      await addMessage( "agent" , message);
    }
  }

  async function removeTags() {
    await addMessage( "user" , agent.query);
    let tag = agent.parameters.tag;

    await fetch("https://mysqlcs639.cs.wisc.edu/application/tags", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    })
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
        tags = resp.tags;
      })
      .catch((error) => {
        console.log(error);
      });

    if (tags.length > 0) {
      let url = "https://mysqlcs639.cs.wisc.edu/application/tags/" + tag;
      await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });
      let message = "Page is now not being filtered by: " + tag;
      agent.add(message);
      await addMessage( "agent" , message);
    } else {
      let message = "No valid tag, please try filtering again";
      agent.add(message);
      await addMessage( "agent" , message);
    }
  }

  // Add items to cart
  async function addCart() {
    await addMessage( "user" , agent.query);
    let id = productids[agent.parameters.products];
    let number = agent.parameters.number;
    if (agent.parameters.number == "") {
      number = 1;
    }

    // Loop through all ids
    if (id !== -1) {

      for (let i = 0; i < number; i++) {
        let url = "https://mysqlcs639.cs.wisc.edu/application/products/" + id;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
          },
        });
      }
      let message = "Successfully added " + number + " " + agent.parameters.products + " to your cart!";
      agent.add(message);
      await addMessage( "agent" , message);

    } else {
      let message =
        "Couldn't find the item that you specified, please try again.";
      agent.add(message);
      await addMessage( "agent" , message);
    }
  }
  async function removeCart() {
    await addMessage( "user" , agent.query);
    let id = productids[agent.parameters.products];
    let number = agent.parameters.number;
    if (agent.parameters.number == "") {
      number = 1;
    }
    if (id !== -1) {
      for (let i = 0; i < number; i++) {
        let url = "https://mysqlcs639.cs.wisc.edu/application/products/" + id;
        await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
          },
        });
      }
      let message = "Successfully removed " + number + " " + agent.parameters.products + " from your cart!";
      agent.add(message);
      await addMessage( "agent" , message);
    } else {
      let message =
        "Couldn't find the item that you specified, please try again";
      agent.add(message);
      await addMessage( "agent" , message);
    }
  }

  async function emptyCart() {
    await addMessage( "user" , agent.query);
    let url = "https://mysqlcs639.cs.wisc.edu/application/products/";
    await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    });
    agent.add("Your cart was cleared");
    await addMessage( "agent" , "Your cart has been cleared!");
  }

  async function finishCart() {
    let url = "https://mysqlcs639.cs.wisc.edu/application/products/";
    await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    });
    agent.add("Your cart was cleared");
  }

  // Review and confirm cart
  async function confirmCart() {
    await addMessage( "user" , agent.query);
    let cart = [];
    await fetch("https://mysqlcs639.cs.wisc.edu/application/products", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    })
      .then((resp) => resp.json())
      .then((resp) => {
        cart = resp.products;
        console.log(cart);
      })
      .catch((error) => {
        console.log(error);
      });
    let message = "You have ";
    let price = 0;
    for (let i = 0; i < cart.length; i++) {
      price += cart[i].price * cart[i].count;
      if (i == 0) {
        message += "(" + cart[i].count + ") " + cart[i].name + "";
      } else if (i < cart.length - 1) {
        message += ", (" + cart[i].count + ") " + cart[i].name;
      } else {
        message += " and (" + cart[i].count + ") " + cart[i].name;
      }
    }
    message += ". The total price is " + price + ". ";
    agent.add(message);
    await addMessage( "agent" , message);
    agent.add("Would you like to confirm this and finish payment?");
    await addMessage( "agent" , "Would you like to confirm this and finish payment?");
  }

  async function acceptCart() {
    await addMessage( "user" , agent.query);
    agent.add("Your order has been placed! Thank you!");
    await addMessage( "agent" , "Your order has been placed! Thank you!");
    await finishCart();
  }

  async function rejectCart() {
    await addMessage( "user" , agent.query);
    agent.add("No problem! You can continue browsing.");
    await addMessage( "agent" , "No problem! You can continue browsing.");
  }

  // Navigate between pages
  async function navigate() {
    let page = agent.parameters.pages;
    console.log(page);
    if ((page === "homepage") || (page === "back")) {
      page = "/" + username;
    } else if (page === "signup") {
      page = "/signUp";
      await deleteChat();
    } else if (page === "signin") {
      page = "/signIn";
      await deleteChat();
    } else if (page === "welcome") {
      page = "/";
      await deleteChat();
    } else if (agent.parameters.pages === "") {
      agent.add("Should go to product page")
      let id = productids[agent.parameters.products];
      let info = [];
      await fetch("https://mysqlcs639.cs.wisc.edu/products" + "/" + id, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      })
        .then((resp) => resp.json())
        .then((resp) => {
          info = resp.category;
          console.log(info);
        })
        .catch((error) => {
          console.log(error);
        });
      page = "/" + username + "/" + info + "/products/" + productids[agent.parameters.products];
    }
    else if (page === agent.parameters.pages) {
      page = "/" + username + "/" + agent.parameters.pages;
    }

    else if (page === cart) {
      page = "/" + username + "/" + "cart";
    }

    await fetch("https://mysqlcs639.cs.wisc.edu/application", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify({ page: page }),
    })
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
      })
      .catch((error) => {
        console.log(error);
      });
    await addMessage( "user" , agent.query);
    let outputMessage = "Taking you there!";
    await addMessage( "agent" , outputMessage);
    agent.add(outputMessage);
  }

  let intentMap = new Map();
  intentMap.set("Default Welcome Intent", welcome);
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set("Login", login);
  intentMap.set("QueryCategories", searchCategories);
  intentMap.set("QueryTags", searchTag);
  intentMap.set("QueryItem", searchItem);
  intentMap.set("cartClear", emptyCart);
  intentMap.set("tagAdd", selectTags);
  intentMap.set("tagDelete", removeTags);
  intentMap.set("navigate", navigate);
  intentMap.set("cartConfirm", confirmCart);
  intentMap.set("cartConfirm - yes", acceptCart);
  intentMap.set("cartConfirm - no", rejectCart);
  intentMap.set("cartAdd", addCart);
  intentMap.set("cartRemove", removeCart);
  agent.handleRequest(intentMap);
});
app.listen(process.env.PORT || 8080);