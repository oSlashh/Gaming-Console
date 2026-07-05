import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'preview/:game',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => {
      return [
        { game: 'flappy' },
        { game: 'puzzle' },
        { game: 'reaction' },
        { game: 'oops' },
        { game: 'howfaroff' },
        { game: 'wavelength' }
      ];
    }
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];