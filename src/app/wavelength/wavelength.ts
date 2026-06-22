import { Router } from '@angular/router';
import {
  Component, signal, computed, ChangeDetectionStrategy, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
export interface Team {
  id: number;
  name: string;
  score: number;
  color: string;
}
export type GamePhase = 'setup' | 'psychic' | 'guessing' | 'reveal';
export type GameMode = 'menu' | 'wavelength' | 'howFarOff';

export interface JournalPage {
  id: number;
  title: string;
}
export interface EstimationQuestion {
  question: string;
  answer: number;
  unit?: string;
}
const TEAM_COLORS = ['#7c3aed', '#0891b2', '#d97706', '#dc2626', '#059669', '#db2777'];
const CATEGORIES: [string, string][] = [
  ['Worst Bumper Sticker', 'Cleverest Bumper Sticker'],
  ['Cheap', 'Expensive'],
  ['Lazy', 'Hardworking'],
  ['Good', 'Evil'],
  ['Safe', 'Dangerous'],
  ['Cold', 'Hot'],
  ['Ugly', 'Beautiful'],
  ['Boring', 'Exciting'],
  ['Simple', 'Complex'],
  ['Quiet', 'Loud'],
  ['Slow', 'Fast'],
  ['Old', 'New'],
  ['Small', 'Large'],
  ['Weak', 'Strong'],
  ['Sad', 'Happy'],
  ['Useless', 'Useful'],
  ['Rare', 'Common'],
  ['Fake', 'Authentic'],
  ['Serious', 'Funny'],
  ['Soft', 'Hard'],
  ['Dark', 'Bright'],
  ['Natural', 'Artificial'],
  ['Healthy', 'Unhealthy'],
  ['Overrated', 'Underrated'],
  ['Introvert', 'Extrovert'],
  ['Pessimistic', 'Optimistic'],
  ['Humble', 'Arrogant'],
  ['Smart', 'Dumb'],
  ['Brave', 'Cowardly'],
  ['Forgiving', 'Resentful'],
  ['Trustworthy', 'Suspicious'],
  ['Relaxing', 'Stressful'],
  ['Gross', 'Delicious'],
  ['Elegant', 'Tacky'],
  ['Timeless', 'Trendy'],
  ['Cliché', 'Original'],
  ['Selfish', 'Generous'],
  ['Polite', 'Rude'],
  ['Logical', 'Emotional'],
  ['Realistic', 'Idealistic'],
  ['Digital', 'Analog'],
  ['Urban', 'Rural'],
  ['Formal', 'Casual'],
  ['Vintage', 'Modern'],
  ['Sweet', 'Bitter'],
  ['Smooth', 'Rough'],
  ['Private', 'Public'],
  ['Structured', 'Chaotic'],
  ['Abstract', 'Concrete'],
  ['Minimalist', 'Maximalist'],
  ['Low-tech', 'High-tech'],
  ['Passive', 'Aggressive'],
  ['Dependent', 'Independent'],
  ['Conservative', 'Progressive'],
  ['Nostalgic', 'Futuristic'],
  ['Frugal', 'Lavish'],
  ['Humble', 'Boastful'],
  ['Literal', 'Figurative'],
  ['Niche', 'Mainstream'],
  ['Risky', 'Cautious'],
  ['Intuitive', 'Analytical'],
  ['Masculine', 'Feminine'],
  ['Guilty Pleasure', 'High Culture'],
  ['Tacky Gift', 'Perfect Gift'],
  ['Worst Superpower', 'Best Superpower'],
  ['Nightmare Pet', 'Dream Pet'],
  ['Worst Invention', 'Best Invention'],
  ['Awful First Date', 'Perfect First Date'],
  ['Terrible Vacation', 'Dream Vacation'],
  ['Bad Career Advice', 'Great Career Advice'],
  ['Worst Icebreaker', 'Best Icebreaker'],
  ['Terrible Supervillain Name', 'Terrifying Supervillain Name'],
  ['Childish', 'Mature'],
  ['Underdog', 'Champion'],
  ['Forgettable Movie', 'Iconic Movie'],
  ['Cringe', 'Cool'],
  ['Overcooked', 'Perfectly Cooked'],
  ['Mediocre', 'Extraordinary'],
  ['Predictable', 'Surprising'],
  ['Dull Party', 'Epic Party'],
  ['Bad Habit', 'Good Habit'],
  ['Annoying Personality', 'Charming Personality'],
  ['Fleeting', 'Eternal'],
  ['Shallow', 'Deep'],
  ['Passive', 'Active'],
  ['Impractical', 'Practical'],
  ['Cluttered', 'Organized'],
  ['Sour', 'Sweet'],
  ['Fragile', 'Sturdy'],
  ['Invisible', 'Conspicuous'],
  ['Forgettable Name', 'Memorable Name'],
  ['Worst Band Name', 'Best Band Name'],
  ['Terrible Slogan', 'Iconic Slogan'],
  ['Bad Boss', 'Great Boss'],
  ['Weak Argument', 'Convincing Argument'],
  ['Boring Hobby', 'Fascinating Hobby'],
  ['Embarrassing Outfit', 'Iconic Outfit'],
  ['Dreadful Morning', 'Perfect Morning'],
  ['Awkward Silence', 'Comfortable Silence'],
  ['Forgettable Meal', 'Unforgettable Meal'],
  ['Worst Excuse', 'Best Excuse'],
  ['Terrible Joke', 'Perfect Joke'],
  ['Mediocre Sidekick', 'Legendary Sidekick'],
  ['Boring Superpower', 'Amazing Superpower'],
  ['Terrible Trend', 'Iconic Trend'],
  ['Worst Advice', 'Wisest Advice'],
];
const HFO_QUESTIONS: EstimationQuestion[] = [
  { question: 'How many bones are in the human body?', answer: 206 },
  { question: 'What year was YouTube launched?', answer: 2005 },
  { question: 'How many countries are in Africa?', answer: 54 },
  { question: 'How many keys are on a standard piano?', answer: 88 },
  { question: 'How many players are on a soccer team on the field at once?', answer: 11 },
  { question: 'How many countries are members of the United Nations?', answer: 193 },
  { question: 'How many strings does a standard guitar have?', answer: 6 },
  { question: 'How many minutes are there in a full day?', answer: 1440 },
  { question: 'How many feet are in one mile?', answer: 5280 },
  { question: 'How many fluid ounces are in a gallon?', answer: 128 },
  { question: 'What year did the Berlin Wall fall?', answer: 1989 },
  { question: 'What year was the first iPhone released?', answer: 2007 },
  { question: 'How many rings are on the Olympic flag?', answer: 5 },
  { question: 'How many teeth does a typical adult human have?', answer: 32 },
  { question: 'How many chromosomes are in a human cell?', answer: 46 },
  { question: 'How many continents are there on Earth?', answer: 7 },
  { question: "How many bones are in a giraffe's neck?", answer: 7 },
  { question: 'How many cards are in a standard deck, not counting jokers?', answer: 52 },
  { question: 'How many days does it take Earth to orbit the sun?', answer: 365 },
  { question: 'What is the boiling point of water in Fahrenheit at sea level?', answer: 212, unit: '°F' },
  { question: 'How many time zones does the continental United States have?', answer: 4 },
  { question: "How many bones are in a cat's body?", answer: 230 },
  { question: 'How many planets are in our solar system?', answer: 8 },
  { question: 'How many pentagon-shaped panels are on a traditional soccer ball?', answer: 12 },
  { question: "How many bones are in a horse's body?", answer: 205 },
  { question: 'What year did World War II end?', answer: 1945 },
  { question: 'How many states are in the United States?', answer: 50 },
  { question: 'How many elements are currently recognized on the periodic table?', answer: 118 },
  { question: 'How many Grand Slam tennis tournaments are held each year?', answer: 4 },
  { question: 'How many bones make up the human skull, excluding the jaw?', answer: 22 },
  { question: 'How many countries are there in the world?', answer: 195 },
{ question: 'How many days are in a leap year?', answer: 366 },
{ question: 'How many squares are on a chessboard?', answer: 64 },
{ question: 'How many stars are on the US flag?', answer: 50 },
{ question: 'How many letters are in the English alphabet?', answer: 26 },
{ question: 'How many seconds are in an hour?', answer: 3600 },
{ question: 'How many months have 31 days?', answer: 7 },
{ question: 'How many hours are in a week?', answer: 168 },
{ question: 'How many years are in a century?', answer: 100 },
{ question: 'How many years are in a millennium?', answer: 1000 },
{ question: 'What year did Facebook launch?', answer: 2004 },
{ question: 'What year did Instagram launch?', answer: 2010 },
{ question: 'What year did TikTok launch globally?', answer: 2018 },
{ question: 'What year was Google founded?', answer: 1998 },
{ question: 'What year did Netflix begin streaming?', answer: 2007 },
{ question: 'What year did Minecraft release?', answer: 2011 },
{ question: 'What year did GTA V release?', answer: 2013 },
{ question: 'What year did Discord launch?', answer: 2015 },
{ question: 'What year was ChatGPT released?', answer: 2022 },
{ question: 'What year was the first PlayStation released?', answer: 1994 },
{ question: 'How many NBA players are on court per team?', answer: 5 },
{ question: 'How many holes are played in a full round of golf?', answer: 18 },
{ question: 'How many laps is a Formula 1 race typically around?', answer: 60 },
{ question: 'How many players are on a baseball team on the field?', answer: 9 },
{ question: 'How many players start for a volleyball team?', answer: 6 },
{ question: 'How many overs are in a T20 cricket innings?', answer: 20 },
{ question: 'How many wickets are in a cricket innings?', answer: 10 },
{ question: 'How many players are on an ice hockey team on the ice?', answer: 6 },
{ question: 'How many Grand Prix races are usually in an F1 season?', answer: 24 },
{ question: 'How many minutes is a soccer match?', answer: 90 },
{ question: 'How many moons does Mars have?', answer: 2 },
{ question: 'How many moons does Jupiter have?', answer: 95 },
{ question: 'How many planets are larger than Earth?', answer: 4 },
{ question: 'How many Earths could fit inside Jupiter?', answer: 1300 },
{ question: 'How many minutes does sunlight take to reach Earth?', answer: 8 },
{ question: 'What is the average Earth-Moon distance in km?', answer: 384400 },
{ question: 'What year did humans first land on the Moon?', answer: 1969 },
{ question: 'How many astronauts walked on the Moon?', answer: 12 },
{ question: 'How many planets have rings?', answer: 4 },
{ question: 'How many stars are on the Australian flag?', answer: 6 },
{ question: 'How many hearts does an octopus have?', answer: 3 },
{ question: 'How many stomachs does a cow have?', answer: 4 },
{ question: 'How many legs does a spider have?', answer: 8 },
{ question: 'How many teeth does a shark replace in its lifetime?', answer: 30000 },
{ question: 'How many species of penguins exist?', answer: 18 },
{ question: 'How many lives is a cat said to have?', answer: 9 },
{ question: 'How many legs does a lobster have?', answer: 10 },
{ question: 'How many noses does a slug have?', answer: 4 },
{ question: 'How many wings does a bee have?', answer: 4 },
{ question: 'How many eyes does a dragonfly have?', answer: 5 },
{ question: 'How many minutes is the average feature film?', answer: 120 },
{ question: 'How many Harry Potter books are there?', answer: 7 },
{ question: 'How many seasons did Friends have?', answer: 10 },
{ question: 'How many episodes are in Breaking Bad?', answer: 62 },
{ question: 'How many Avengers movies are there?', answer: 4 },
{ question: 'How many Pixar movies existed by 2025?', answer: 28 },
{ question: 'How many Oscars has Leonardo DiCaprio won?', answer: 1 },
{ question: 'How many seasons does Stranger Things currently have?', answer: 5 },
{ question: 'How many Lord of the Rings films are in the original trilogy?', answer: 3 },
{ question: 'How many Shrek movies are there?', answer: 4 },
{ question: 'How many countries are in Europe?', answer: 44 },
{ question: 'How many states does India have?', answer: 28 },
{ question: 'How many territories does India have?', answer: 8 },
{ question: 'How many provinces are in Canada?', answer: 10 },
{ question: 'How many states are in Australia?', answer: 6 },
{ question: 'How many countries border China?', answer: 14 },
{ question: 'How many countries border Germany?', answer: 9 },
{ question: 'How many countries border India?', answer: 6 },
{ question: 'How many Great Lakes are there?', answer: 5 },
{ question: 'How many continents touch the Pacific Ocean?', answer: 5 },
{ question: 'How many cards are in Uno?', answer: 108 },
{ question: 'How many spaces are on a Monopoly board?', answer: 40 },
{ question: 'How many Pokémon existed in Generation 1?', answer: 151 },
{ question: 'How many Pokémon existed by Generation 9?', answer: 1025 },
{ question: 'How many gyms are in Pokémon Red and Blue?', answer: 8 },
{ question: 'How many villagers can live on an Animal Crossing island?', answer: 10 },
{ question: 'How many pieces does each player start with in chess?', answer: 16 },
{ question: 'How many dots are on a standard die in total?', answer: 21 },
{ question: 'How many properties can be bought in Monopoly?', answer: 28 },
{ question: 'How many letters are worth 1 point in Scrabble?', answer: 10 },
{ question: 'How many minutes are in a year?', answer: 525600 },
{ question: 'How many hours does the average person sleep per night?', answer: 8 },
{ question: 'How many days does the average pregnancy last?', answer: 280 },
{ question: 'How many teeth does a child typically have?', answer: 20 },
{ question: 'How many ribs does a human have?', answer: 24 },
{ question: 'How many muscles are in the human body?', answer: 600 },
{ question: 'How many litres of blood are in the human body?', answer: 5 },
{ question: 'How many taste buds does the average human have?', answer: 10000 },
{ question: 'How many vertebrae are in the human spine?', answer: 33 },
{ question: 'How many fingernails and toenails does a person have?', answer: 20 },
{ question: 'How many years did Queen Elizabeth II reign?', answer: 70 },
{ question: 'What year did World War I begin?', answer: 1914 },
{ question: 'What year did World War I end?', answer: 1918 },
{ question: 'What year did India gain independence?', answer: 1947 },
{ question: 'What year did the Titanic sink?', answer: 1912 },
{ question: 'What year was the first email sent?', answer: 1971 },
{ question: 'What year was the World Wide Web invented?', answer: 1989 },
{ question: 'What year was the first Star Wars movie released?', answer: 1977 },
{ question: 'What year was the first FIFA World Cup?', answer: 1930 },
{ question: 'What year did the Nintendo Switch launch?', answer: 2017 },
{ question: 'How many Marvel movies are in the MCU (up to 2025)?', answer: 36 },
{ question: 'How many Oscar awards has Titanic won?', answer: 11 },
{ question: 'How many Harry Potter films are there?', answer: 8 },
{ question: 'How many Hobbit films are there?', answer: 3 },
{ question: 'How many Jurassic Park / World films are there?', answer: 6 },
{ question: 'How many Fast & Furious films exist?', answer: 11 },
{ question: 'How many Avengers movies are there?', answer: 4 },
{ question: 'How many actors have played Spider-Man in live action movies?', answer: 3 },
{ question: 'How many minutes long is Avengers: Endgame?', answer: 181 },
{ question: 'What year was Interstellar released?', answer: 2014 },
{ question: 'What year was The Dark Knight released?', answer: 2008 },
{ question: 'What year was Inception released?', answer: 2010 },
{ question: 'How many Star Wars saga films are there?', answer: 9 },
{ question: 'How many Lord of the Rings movies are in the original trilogy?', answer: 3 },
{ question: 'How many Pirates of the Caribbean movies are there?', answer: 5 },
{ question: 'How many Hokage have there been in Naruto?', answer: 8 },
{ question: 'How many Dragon Balls are there?', answer: 7 },
{ question: 'How many Straw Hat Pirates are currently in Luffy’s crew?', answer: 10 },
{ question: 'How many Titan shifters exist in Attack on Titan?', answer: 9 },
{ question: 'How many seasons does Demon Slayer currently have?', answer: 4 },
{ question: 'How many members are in Class 1-A in My Hero Academia?', answer: 20 },
{ question: 'How many Pokémon were in Generation 1?', answer: 151 },
{ question: 'How many wishes can Shenron normally grant?', answer: 2 },
{ question: 'How many episodes are in Death Note?', answer: 37 },
{ question: 'How many episodes are in Cowboy Bebop?', answer: 26 },
{ question: 'What year did Naruto first air?', answer: 2002 },
{ question: 'What year did One Piece first air?', answer: 1999 },
{ question: 'How many Hashira are there in Demon Slayer?', answer: 9 },
{ question: 'How many members are in Akatsuki?', answer: 10 },
{ question: 'How many episodes does Attack on Titan have in total?', answer: 94 },
{ question: 'How many gyms are there in Pokémon Red and Blue?', answer: 8 },
{ question: 'What year was Minecraft released?', answer: 2011 },
{ question: 'What year was Fortnite released?', answer: 2017 },
{ question: 'How many players are in a Valorant team?', answer: 5 },
{ question: 'How many champions are in League of Legends (approx)?', answer: 170 },
{ question: 'How many playable agents are in Valorant (approx)?', answer: 28 },
{ question: 'What year was GTA V released?', answer: 2013 },
{ question: 'How many mainline Pokémon generations are there?', answer: 9 },
{ question: 'How many blocks tall is Steve in Minecraft?', answer: 2 },
{ question: 'How many players are in a PUBG squad?', answer: 4 },
{ question: 'How many classes are there in Clash Royale?', answer: 8 },
{ question: 'What year was the Nintendo Switch released?', answer: 2017 },
{ question: 'How many pieces does each player start with in chess?', answer: 16 },
{ question: 'How many players are in a CS2 team?', answer: 5 },
{ question: 'How many islands are there in GTA V?', answer: 1 },
{ question: 'How many characters can a standard tweet contain?', answer: 280 },
{ question: 'What year was Instagram launched?', answer: 2010 },
{ question: 'What year was TikTok launched globally?', answer: 2018 },
{ question: 'What year was Discord launched?', answer: 2015 },
{ question: 'How many subscribers does MrBeast have (millions, approx)?', answer: 400, unit: 'million' },
{ question: 'How many followers does Cristiano Ronaldo have on Instagram (millions, approx)?', answer: 650, unit: 'million' },
{ question: 'How many days did the r/place 2023 event run?', answer: 5 },
{ question: 'How many billion monthly active users does YouTube have (approx)?', answer: 2.7, unit: 'billion' },
{ question: 'How many million subscribers does T-Series have (approx)?', answer: 300, unit: 'million' },
{ question: 'How many letters are in the Google logo?', answer: 6 },
{ question: 'How many Grammy Awards has Kendrick Lamar won?', answer: 22 },
{ question: 'How many Grammy Awards has Drake won?', answer: 5 },
{ question: 'How many Grammy Awards has J. Cole won?', answer: 2 },
{ question: 'How many Grammy Awards has Harry Styles won?', answer: 3 },
{ question: 'How many Grammy Awards has Travis Scott won?', answer: 0 },
{ question: 'How many Grammy Awards has Kanye West won?', answer: 24 },
{ question: 'How many Grammy Awards has Taylor Swift won?', answer: 14 },
{ question: 'How many studio albums has Drake released?', answer: 8 },
{ question: 'How many studio albums has Kendrick Lamar released?', answer: 6 },
{ question: 'How many studio albums has J. Cole released?', answer: 7 },
{ question: 'How many studio albums has Harry Styles released?', answer: 3 },
{ question: 'How many studio albums has Travis Scott released?', answer: 4 },
{ question: 'How many studio albums has Kanye West released?', answer: 11 },
{ question: 'How many studio albums has Taylor Swift released?', answer: 11 },
{ question: 'What year did Kendrick Lamar release good kid, m.A.A.d city?', answer: 2012 },
{ question: 'What year did Kendrick Lamar release DAMN.?', answer: 2017 },
{ question: 'What year did Kendrick Lamar release Mr. Morale & The Big Steppers?', answer: 2022 },
{ question: 'What year did Drake release Take Care?', answer: 2011 },
{ question: 'What year did Drake release Views?', answer: 2016 },
{ question: 'What year did J. Cole release 2014 Forest Hills Drive?', answer: 2014 },
{ question: 'What year did Travis Scott release Astroworld?', answer: 2018 },
{ question: 'What year did Kanye West release Graduation?', answer: 2007 },
{ question: 'What year did Taylor Swift release Midnights?', answer: 2022 },
{ question: 'What year did Harry Styles release Harry’s House?', answer: 2022 },
{ question: 'How many tracks are on Kendrick Lamar’s DAMN.?', answer: 14 },
{ question: 'How many tracks are on Astroworld?', answer: 17 },
{ question: 'How many tracks are on Graduation?', answer: 13 },
{ question: 'How many tracks are on Midnights (standard edition)?', answer: 13 },
{ question: 'How many tracks are on Harry’s House?', answer: 13 },
{ question: 'How many members were in One Direction?', answer: 5 },
{ question: 'How many children does Drake have?', answer: 1 },
{ question: 'How many children does Kanye West have?', answer: 4 },
{ question: 'How many siblings does J. Cole have?', answer: 1 },
{ question: 'How many siblings does Taylor Swift have?', answer: 1 },
{ question: 'How many songs are on Taylor Swift’s 1989 (Taylor’s Version)?', answer: 21 },
{ question: 'How many songs are on Taylor Swift’s Folklore?', answer: 16 },
{ question: 'How many songs are on Taylor Swift’s Lover?', answer: 18 },
{ question: 'How many minutes long is Kendrick Lamar’s Not Like Us?', answer: 4 },
{ question: 'How many minutes long is Travis Scott’s Sicko Mode?', answer: 5 },
{ question: 'How many minutes long is Drake’s God’s Plan?', answer: 3 },
{ question: 'How many weeks did Old Town Road spend at #1 on Billboard?', answer: 19 },
{ question: 'How many Billboard Hot 100 #1 songs does Drake have?', answer: 14 },
{ question: 'How many Billboard Hot 100 #1 songs does Taylor Swift have?', answer: 12 },
{ question: 'How many Billboard Hot 100 #1 songs does Kanye West have?', answer: 5 },
{ question: 'What year was Kendrick Lamar born?', answer: 1987 },
{ question: 'What year was Drake born?', answer: 1986 },
{ question: 'What year was J. Cole born?', answer: 1985 },
{ question: 'What year was Harry Styles born?', answer: 1994 },
{ question: 'What year was Travis Scott born?', answer: 1991 },
{ question: 'What year was Kanye West born?', answer: 1977 },
{ question: 'What year was Taylor Swift born?', answer: 1989 },
{ question: 'How many total members were in the XXL Freshman Class of 2011?', answer: 10 },
{ question: 'How many years passed between Astroworld and Utopia?', answer: 5 },
{ question: 'How many years passed between DAMN. and GNX?', answer: 7 },
{ question: 'How many years passed between 1989 and 1989 (Taylor’s Version)?', answer: 9 }
];
@Component({
  
  selector: 'app-wavelength',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wavelength.html',
  styleUrls: ['./wavelength.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WavelengthComponent implements AfterViewInit, OnDestroy {
  // ─── Background parallax (mouse-driven, rAF-throttled) ───────────────────
  private _parallaxRafId: number | null = null;
  private _pendingParallax: { x: number; y: number } | null = null;
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Normalize to a small ratio centered on 0 (-0.5 .. 0.5) so every
    // background layer can scale it by its own "--depth" for a parallax feel.
    const xRatio = event.clientX / window.innerWidth - 0.5;
    const yRatio = event.clientY / window.innerHeight - 0.5;
    this._pendingParallax = { x: xRatio, y: yRatio };
    if (!this._parallaxRafId) {
      this._parallaxRafId = requestAnimationFrame(() => {
        if (this._pendingParallax) {
          document.documentElement.style.setProperty('--px', `${this._pendingParallax.x}`);
          document.documentElement.style.setProperty('--py', `${this._pendingParallax.y}`);
        }
        this._parallaxRafId = null;
      });
    }
  }
  pages: JournalPage[] = [
    { id: 1, title: 'Wavelength' },
    { id: 2, title: 'How Far Off?' },
    { id: 3, title: 'Dev Brainstorm' },
    { id: 4, title: 'Coming Soon' },
    { id: 5, title: 'Credits' }
  ];

  currentPageIndex = signal(0);
  notebookOpen = signal(false);
  notebookState = signal<'closed' | 'lifting' | 'flying' | 'open' | 'closing-pages' | 'closing'>('closed');

  openNotebook() {
    if (this.notebookState() !== 'closed') return;
    this.notebookState.set('lifting');
    setTimeout(() => {
      this.notebookState.set('flying');
      setTimeout(() => {
        this.notebookState.set('open');
        this.notebookOpen.set(true);
      }, 600); // Flying stage: 600ms
    }, 300); // Lifting stage: 300ms
  }

  closeNotebook() {
    if (this.notebookState() !== 'open') return;
    this.notebookState.set('closing-pages');
    setTimeout(() => {
      this.notebookOpen.set(false);
      this.notebookState.set('closing');
      setTimeout(() => {
        this.notebookState.set('closed');
      }, 600); // Flying back stage: 600ms
    }, 400); // Closing pages stage: 400ms
  }

  handleBackClick() {
    if (this.notebookOpen() || this.notebookState() === 'closing-pages') {
      this.closeNotebook();
    } else {
      this.quitGame();
    }
  }

  previousPage() {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update(idx => idx - 1);
    }
  }

  nextPage() {
    if (this.currentPageIndex() < this.pages.length - 1) {
      this.currentPageIndex.update(idx => idx + 1);
    }
  }

  constructor(private router: Router) {
    if (typeof document !== 'undefined') {
      const linkId = 'wl-google-fonts';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat+Brush&family=Fredoka+One&family=Gochi+Hand&family=Patrick+Hand&family=Nunito:wght@400;600;700;800;900&display=swap';
        document.head.appendChild(link);
      }
    }
  }
  @ViewChild('dialCanvas') dialCanvas!: ElementRef<HTMLElement>;
  
  // ─── Game Mode ───────────────────────────────────────────────────────────
  gameMode = signal<GameMode>('menu');
  // ─── Teams ───────────────────────────────────────────────────────────────
  wlTeams = signal<Team[]>([
    { id: 1, name: 'Team 1', score: 0, color: TEAM_COLORS[0] },
    { id: 2, name: 'Team 2', score: 0, color: TEAM_COLORS[1] },
  ]);
  wlNextTeamId = 3;

  hfoTeams = signal<Team[]>([
    { id: 1, name: 'Team 1', score: 0, color: TEAM_COLORS[0] },
    { id: 2, name: 'Team 2', score: 0, color: TEAM_COLORS[1] },
  ]);
  hfoNextTeamId = 3;

  teams = computed(() => this.gameMode() === 'howFarOff' ? this.hfoTeams() : this.wlTeams());
  editingTeamId = signal<number | null>(null);
  editingName = signal('');
  randomCategory(): void {
  const random =
    CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  this.customLeft.set(random[0]);
  this.customRight.set(random[1]);
  this.useCustomCategory.set(true);
}
  // ─── Game state ──────────────────────────────────────────────────────────
  phase = signal<GamePhase>('setup');
  
  currentTeamIndex = signal(0);
  currentTeam = computed(() => this.teams()[this.currentTeamIndex()]);
  category = signal<[string, string]>(['', '']);
  customLeft = signal('');
customRight = signal('');
useCustomCategory = signal(false);
  targetPosition = signal(50);
  targetRevealed = signal(false);
  guessPosition = signal(50);
  guessLocked = signal(false);
  roundScore = signal(0);
  roundNumber = signal(0);
  // Needle drag state
  isDragging = false;
  private _rafId: number | null = null;
  private _pendingGuess: number | null = null;
  // ─── Computed helpers ────────────────────────────────────────────────────
  sortedTeams = computed(() => [...this.teams()].sort((a, b) => b.score - a.score));
  scoreForPosition = computed(() => {
    const diff = Math.abs(this.targetPosition() - this.guessPosition());
    if (diff <= 5)  return 4;
    if (diff <= 10) return 3;
    if (diff <= 15) return 2;
    if (diff <= 20) return 1;
    return 0;
  });
  // ─── How Far Off? state ──────────────────────────────────────────────────
  hfoCurrentQuestion = signal<EstimationQuestion>(HFO_QUESTIONS[0]);
  hfoGuesses = signal<Record<number, number | null>>({});
  hfoRevealed = signal(false);
  hfoTurnIndex = signal(0);
  hfoDraftGuess = signal<number | null>(null);
  hfoTransition = signal(false);
  currentHfoTeam = computed(() => this.teams()[this.hfoTurnIndex()] ?? this.teams()[0]);
  nextHfoTeam = computed(() => {
    const next = this.hfoTurnIndex() + 1;
    return next < this.teams().length ? this.teams()[next] : null;
  });
  hfoGuessesEnteredCount = computed(() => {
    const g = this.hfoGuesses();
    return this.teams().filter(t => g[t.id] !== null && g[t.id] !== undefined).length;
  });
  hfoAllGuessesEntered = computed(() => this.hfoGuessesEnteredCount() === this.teams().length);
  hfoResults = computed(() => {
    const answer = this.hfoCurrentQuestion().answer;
    const guesses = this.hfoGuesses();
    const numTeams = this.teams().length;
    const pointsForPlacement = (placement: number): number => {
      if (numTeams === 2) {
        if (placement === 1) return 3;
        if (placement === 2) return 1;
        return 0;
      }
      if (placement === 1) return 3;
      if (placement === 2) return 2;
      if (placement === 3) return 1;
      return 0;
    };
    const withDistance = this.teams().map(t => {
      const guess = guesses[t.id] ?? 0;
      return { team: t, guess, distance: Math.abs(guess - answer) };
    });
    const sorted = [...withDistance].sort((a, b) => a.distance - b.distance);
    let placement = 0;
    let prevDistance: number | null = null;
    return sorted.map((entry, idx) => {
      if (prevDistance === null || entry.distance !== prevDistance) {
        placement = idx + 1;
        prevDistance = entry.distance;
      }
      return {
        teamId: entry.team.id,
        name: entry.team.name,
        color: entry.team.color,
        guess: entry.guess,
        distance: entry.distance,
        placement,
        points: pointsForPlacement(placement),
      };
    });
  });
  // ─── Angular lifecycle ───────────────────────────────────────────────────
  ngAfterViewInit() {}
  ngOnDestroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._parallaxRafId) cancelAnimationFrame(this._parallaxRafId);
  }
  // ─── Helper actions to reset state ───────────────────────────────────────
  fullyResetState() {
    this.resetTeamsToDefault();
    this.editingTeamId.set(null);
    this.editingName.set('');
    this.phase.set('setup');
    this.currentTeamIndex.set(0);
    this.category.set(['', '']);
    this.customLeft.set('');
    this.customRight.set('');
    this.useCustomCategory.set(false);
    this.targetPosition.set(50);
    this.targetRevealed.set(false);
    this.guessPosition.set(50);
    this.guessLocked.set(false);
    this.roundScore.set(0);
    this.roundNumber.set(0);
    this.isDragging = false;
    this._pendingGuess = null;
    
    this.hfoGuesses.set({});
    this.hfoRevealed.set(false);
    this.hfoTurnIndex.set(0);
    this.hfoDraftGuess.set(null);
    this.hfoTransition.set(false);
  }

  resetTeamsToDefault() {
    this.wlTeams.set([
      { id: 1, name: 'Team 1', score: 0, color: TEAM_COLORS[0] },
      { id: 2, name: 'Team 2', score: 0, color: TEAM_COLORS[1] },
    ]);
    this.wlNextTeamId = 3;

    this.hfoTeams.set([
      { id: 1, name: 'Team 1', score: 0, color: TEAM_COLORS[0] },
      { id: 2, name: 'Team 2', score: 0, color: TEAM_COLORS[1] },
    ]);
    this.hfoNextTeamId = 3;
  }

  // ─── Menu actions ────────────────────────────────────────────────────────
  selectGame(game: GameMode) {
    this.fullyResetState();
    this.gameMode.set(game);
    if (game === 'wavelength' || game === 'howFarOff') {
      this.phase.set('setup');
    }
  }
  backToMenu() {
    this.fullyResetState();
    this.gameMode.set('menu');
  }
  // ─── Setup actions ───────────────────────────────────────────────────────
  addWlTeam() {
    const id = this.wlNextTeamId++;
    const color = TEAM_COLORS[(this.wlTeams().length) % TEAM_COLORS.length];
    this.wlTeams.update(t => [...t, { id, name: `Team ${id}`, score: 0, color }]);
  }
  deleteWlTeam(id: number) {
    if (this.wlTeams().length <= 2) return;
    this.wlTeams.update(t => t.filter(x => x.id !== id));
  }
  updateWlTeam() {
    const id = this.editingTeamId();
    const name = this.editingName().trim();
    if (id && name) {
      this.wlTeams.update(t => t.map(x => x.id === id ? { ...x, name } : x));
    }
    this.editingTeamId.set(null);
  }

  addHfoTeam() {
    const id = this.hfoNextTeamId++;
    const color = TEAM_COLORS[(this.hfoTeams().length) % TEAM_COLORS.length];
    this.hfoTeams.update(t => [...t, { id, name: `Team ${id}`, score: 0, color }]);
  }
  deleteHfoTeam(id: number) {
    if (this.hfoTeams().length <= 2) return;
    this.hfoTeams.update(t => t.filter(x => x.id !== id));
  }
  updateHfoTeam() {
    const id = this.editingTeamId();
    const name = this.editingName().trim();
    if (id && name) {
      this.hfoTeams.update(t => t.map(x => x.id === id ? { ...x, name } : x));
    }
    this.editingTeamId.set(null);
  }

  startEdit(team: Team) {
    this.editingTeamId.set(team.id);
    this.editingName.set(team.name);
  }
  cancelEdit() {
    this.editingTeamId.set(null);
  }
  startGame() {
    if (this.teams().length < 2) return;
    this.currentTeamIndex.set(0);
    this.roundNumber.set(0);
    if (this.gameMode() === 'howFarOff') {
      this.startHfoRound();
    } else {
      this.startRound();
    }
  }
  // ─── Round flow ──────────────────────────────────────────────────────────
 startRound() {
  if (
    this.useCustomCategory() &&
    this.customLeft().trim() &&
    this.customRight().trim()
  ) {
    this.category.set([
      this.customLeft().trim(),
      this.customRight().trim()
    ]);
  } else {
    this.category.set(
      CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    );
  }
  this.targetPosition.set(
    Math.floor(Math.random() * 101)
  );
  this.guessPosition.set(50);
  this.guessLocked.set(false);
  this.targetRevealed.set(false);
  this.roundNumber.update(n => n + 1);
  this.phase.set('psychic');
}
  revealTarget() {
    this.targetRevealed.set(true);
  }
  hideForGuessers() {
    this.targetRevealed.set(false);
    this.phase.set('guessing');
  }
  lockGuess() {
    this.guessLocked.set(true);
  }
  revealResult() {
    this.targetRevealed.set(true);
    const score = this.scoreForPosition();
    this.roundScore.set(score);
    this.wlTeams.update(teams =>
      teams.map(t => t.id === this.currentTeam().id ? { ...t, score: t.score + score } : t)
    );
    this.phase.set('reveal');
  }
  nextTurn() {
    this.currentTeamIndex.update(i => (i + 1) % this.teams().length);
    this.startRound();
  }
  resetGame() {
    this.fullyResetState();
  }
  
  // ─── How Far Off? round flow ────────────────────────────────────────────
  startHfoRound() {
    const idx = Math.floor(Math.random() * HFO_QUESTIONS.length);
    this.hfoCurrentQuestion.set(HFO_QUESTIONS[idx]);
    const guesses: Record<number, number | null> = {};
    this.teams().forEach(t => guesses[t.id] = null);
    this.hfoGuesses.set(guesses);
    this.hfoRevealed.set(false);
    this.hfoTransition.set(false);
    this.hfoTurnIndex.set(0);
    this.hfoDraftGuess.set(null);
    this.roundNumber.update(n => n + 1);
    this.phase.set('guessing');
  }
  submitHfoGuess() {
    if (this.hfoDraftGuess() === null) return;
    const team = this.currentHfoTeam();
    this.hfoGuesses.update(g => ({ ...g, [team.id]: this.hfoDraftGuess() }));
    this.hfoDraftGuess.set(null);
    this.hfoTransition.set(true);
  }
  continueToNextHfoTeam() {
    const next = this.hfoTurnIndex() + 1;
    if (next >= this.teams().length) {
      this.revealHfoResults();
    } else {
      this.hfoTurnIndex.set(next);
      this.hfoTransition.set(false);
    }
  }
  revealHfoResults() {
    if (!this.hfoAllGuessesEntered()) return;
    const results = this.hfoResults();
    this.hfoTeams.update(teams =>
      teams.map(t => {
        const r = results.find(x => x.teamId === t.id);
        return r ? { ...t, score: t.score + r.points } : t;
      })
    );
    this.hfoTransition.set(false);
    this.hfoRevealed.set(true);
  }
  hfoNextQuestion() {
    this.startHfoRound();
  }
  ordinal(n: number): string {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
  // ─── Needle drag (pointer events) ────────────────────────────────────────
  onDialPointerDown(event: PointerEvent) {
    if (this.guessLocked()) return;
    this.isDragging = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.updateGuessFromEvent(event);
  }
  onDialPointerMove(event: PointerEvent) {
    if (!this.isDragging) return;
    this._pendingGuess = this.calcGuessFromEvent(event);
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => {
        if (this._pendingGuess !== null) this.guessPosition.set(this._pendingGuess);
        this._rafId = null;
      });
    }
  }
  onDialPointerUp(event: PointerEvent) {
    this.isDragging = false;
    this.updateGuessFromEvent(event);
  }
  private calcGuessFromEvent(event: PointerEvent): number {
    const el = document.getElementById('dial-area');
    if (!el) return this.guessPosition();
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.97;
    const dx = event.clientX - cx;
    const dy = cy - event.clientY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = Math.max(0, Math.min(180, angle));
    return Math.round(100 - ((angle / 180) * 100));
  }
  private updateGuessFromEvent(event: PointerEvent) {
    if (this.guessLocked()) return;
    this.guessPosition.set(this.calcGuessFromEvent(event));
  }
  // ─── SVG / rendering helpers ──────────────────────────────────────────────
  posToAngle(pos: number): number {
    return 180 - (pos / 100) * 180;
  }
  posToXY(pos: number, r: number, cx: number, cy: number): { x: number; y: number } {
    const angleDeg = this.posToAngle(pos);
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  }
  arcBand(pos1: number, pos2: number, rInner: number, rOuter: number, cx: number, cy: number): string {
    const a1 = this.posToXY(pos1, rOuter, cx, cy);
    const a2 = this.posToXY(pos2, rOuter, cx, cy);
    const b1 = this.posToXY(pos1, rInner, cx, cy);
    const b2 = this.posToXY(pos2, rInner, cx, cy);
    return `M ${a1.x} ${a1.y} A ${rOuter} ${rOuter} 0 0 1 ${a2.x} ${a2.y} L ${b2.x} ${b2.y} A ${rInner} ${rInner} 0 0 0 ${b1.x} ${b1.y} Z`;
  }
  needleCoords(pos: number, rFrom: number, rTo: number, cx: number, cy: number) {
    const from = this.posToXY(pos, rFrom, cx, cy);
    const to = this.posToXY(pos, rTo, cx, cy);
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  }
  getBandColor(points: number): string {
    switch (points) {
      case 4: return '#ffd93d';
      case 3: return '#ff6b6b';
      case 2: return '#7ecce8';
      case 1: return '#b39ddb';
      default: return 'transparent';
    }
  }
  get scoreBands() {
    const t = this.targetPosition();
    return [
      { pts: 1, lo: Math.max(0, t - 20), hi: Math.min(100, t + 20) },
      { pts: 2, lo: Math.max(0, t - 15), hi: Math.min(100, t + 15) },
      { pts: 3, lo: Math.max(0, t - 10), hi: Math.min(100, t + 10) },
      { pts: 4, lo: Math.max(0, t - 5),  hi: Math.min(100, t + 5)  },
    ];
  }
  needleHead(pos: number): string {
    const cx = 250, cy = 270;
    const tip = this.posToXY(pos, 238, cx, cy);
    const base = this.posToXY(pos, 222, cx, cy);
    const angleDeg = this.posToAngle(pos);
    const rad = (angleDeg * Math.PI) / 180;
    const perpX = -Math.sin(rad) * 5;
    const perpY = Math.cos(rad) * 5;
    return `${tip.x},${tip.y} ${base.x + perpX},${base.y - perpY} ${base.x - perpX},${base.y + perpY}`;
  }
  trackTeam(_: number, t: Team) { return t.id; }
  quitGame() {
    this.fullyResetState();
    this.router.navigate(['/game-page']);
  }
}