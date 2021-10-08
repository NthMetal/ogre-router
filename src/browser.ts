

import { Ogre } from './models/ogre';
import { Signaler } from './models/signaler';
import { Router } from './models/router';
import { User } from './models/user';

(window as any).Ogre = Ogre;
(window as any).Router = Router;
(window as any).Signaler = Signaler;
(window as any).User = User;

