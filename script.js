window.onload = function() {
	game = new Game();
	game.startGame();

	var hitButton = document.getElementById('hitButton');
	hitButton.addEventListener('click', function(e) {
		game.player.hit();
		game.updatePlayerScore();
	});

	var standButton = document.getElementById('standButton');
	standButton.addEventListener('click', function(e) {
		game.player.stand();
	});

}


function Game() {
	this.availableCards = [];
	this.dealer = new Player({
		game:this,
		isDealer:true,
	});

	this.player = new Player({
		game:this,
	});

	return this;
}


/*
	Deals a card to the specified player. 
*/
Game.prototype.dealCard = function(player, faceDown) {

	if (this.availableCards.length == 0) {
		this.newDeck();
	}

	var card = this.availableCards.pop();
	card.faceDown = faceDown == true;
	if (player) {
		player.cards.push(card);

		var cardEl = card.createElement();
		var playerEl;
		if (player == this.player) {
			playerEl = document.getElementById('player');
		} else if (player == this.dealer) {
			playerEl = document.getElementById('dealer');
		}

		playerEl.appendChild(cardEl);
	}

	return card;
}

/*
	Checks whether it's the specified player's turn
*/
Game.prototype.isPlayersTurn = function(player) {
	return this.current == player;
}

/*
	Advances turns in hitting/standing. Makes dealer move when necessary.
*/
Game.prototype.advancePlayerTurn = function() {

	if (this.player.done && this.dealer.done) {
		this.current = null;
		this.endGame();
	} else {

		this.current = this.current == this.player ? this.dealer : this.player;
		if (this.current.done) {
			this.advancePlayerTurn();
		} else if (this.current == this.dealer) {
			this.makeDealerDecision();
		}
	}
}

/*
	Runs when the game has ended. Displays messaging to user.
*/
Game.prototype.endGame = function() {
	var messsage;
	var win;
	if (this.dealer.busted || this.player.busted) {
		if (this.dealer.busted == this.player.busted) {
			messsage = 'You and the dealer both busted. Sadly, this means you lost.';
			win = false;
		} else if (this.player.busted) {
			messsage = 'You busted. You lose.';
			win = false;
		} else if (this.dealer.busted) {
			messsage = 'The dealer busted. You win!';
			win = true;
		}
	} else {
		var dealerScore = this.dealer.score();
		var playerScore = this.player.score();
		if (dealerScore > playerScore) {
			messsage = 'You lose';
			win = false;
		} else if (playerScore > dealerScore) {
			messsage = 'You win';
			win = true;
		} else {
			messsage = 'You tied. Which, naturally, means the dealer wins';
			win = false;
		}
	}

	/* Show the dealers first card */
	var dealerEl = document.getElementById('dealer');
	this.dealer.cards[0].faceDown = false;
	dealerEl.replaceChild(this.dealer.cards[0].createElement(), dealerEl.children[1]);

	/* Show the dealer's score */
	var score = document.querySelector('#dealer .score');
	score.innerHTML = this.dealer.score();

	/* Display game over message */
	var msgEl = document.getElementById('endMessage');
	msgEl.classList.add((win ? 'win':'lose'));
	msgEl.innerHTML = messsage;
}

/*
	Builds a new deck of cards
*/
Game.prototype.newDeck = function() {
	this.availableCards = [];
	var suits = ['Spades', 'Clubs', 'Hearts', 'Diamonds'];
	var cards = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];
	for (var i = 0; i < suits.length; i++) {
		for (var j = 0; j < cards.length; j++) {
			this.availableCards.push(new Card({
				suit:suits[i],
				identifier:cards[j]
			}));
		};
	};

	this.shuffleDeck();
}

/*
	Shuffle the current deck of cards
*/
Game.prototype.shuffleDeck = function() {
	this.availableCards = _.shuffle(this.availableCards);
}

/*
	Start a game, deal initial hands, check for blackjack
*/
Game.prototype.startGame = function() {

	this.dealCard(this.player);
	this.dealCard(this.dealer, true);
	this.dealCard(this.player);
	this.dealCard(this.dealer);

	this.current = this.player;
	if (this.dealer.score() == 21 || this.player.score() == 21) {
		this.dealer.done = true;
		this.player.done = true;
		this.current = null;
		this.endGame();
	}
	this.updatePlayerScore();

}

/*
	Update the UI element with the player score
*/
Game.prototype.updatePlayerScore = function() {
	var score = document.querySelector('#player .score');
	score.innerHTML = this.player.score();
}

/*
	Processes the dealer's turn
*/
Game.prototype.makeDealerDecision = function() {
	if (this.dealer.score() < 17) {
		this.dealer.hit();
	} else {
		this.dealer.stand();
	}
}

/*
	A player object for blackjack players 
*/
function Player(options) {
	options = options || {};

	this.isDealer = options.isDealer == true;
	this.cards = [];
	this.game = options.game;
	this.done = false;
}

/*
	Request a hit for a player
*/
Player.prototype.hit = function() {
	if (this.game.current == this) {
		var newCard = this.game.dealCard(this);
		var score = this.score();
		if (score >= 21) {
			this.done = true;

			if(score > 21) {
				this.busted = true;
			}
		}

		this.game.advancePlayerTurn();
	}
};

/*
	Stand for player
*/
Player.prototype.stand = function() {
	this.done = true;
	this.game.advancePlayerTurn();
};

/*
	Calculate a player's score. Dropping ace values to 1 when necessary
*/
Player.prototype.score = function() {
	var aces = 0;
	var score = 0;
	for (var i = 0; i < this.cards.length; i++) {
		var vals = this.cards[i].values();
		if (this.cards[i].identifier == 'A') {
			aces++;
		} 

		score += vals[0];
	};

	if (score > 21 && aces > 0) {
		for (var i = 0; i < aces && score > 21; i++) {
			score -= 10;
		};
	}

	return score;
}

/*
	Create a lightweight card object - this might be overkill... CB
*/
function Card(options) {
	this.suit = options.suit;
	this.identifier = options.identifier;
}

/*
	Get possible card values
*/
Card.prototype.values = function() {
	var val = parseInt(this.identifier);

	if (isNaN(val)) {
		if (this.identifier == 'A') {
			return [11, 1];
		} else {
			return [10]; 
		}
	} else {
		return [val];
	}
}

/*
	Create a html element for the card
*/
Card.prototype.createElement = function() {
	var el = document.createElement('DIV');
	el.className = 'card';
	if (this.faceDown) {
		el.classList.add('faceDown');
		el.innerHTML = 'E';
	} else {
		el.classList.add(this.suit);
		el.classList.add('card_' + this.identifier);
		el.innerHTML = this.identifier;
	}

	return el;
}

