import { TestBed } from '@angular/core/testing';

import { Userdetails } from './userdetails';

describe('Userdetails', () => {
  let service: Userdetails;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Userdetails);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
