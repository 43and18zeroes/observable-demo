import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProductService } from './services/product-service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

export interface Product {
  id: number;
  title: string;
  price: number;
  stock: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('observable-demo');

  private service = inject(ProductService);

  // UI state (Signals nur für Komfort – Fokus bleibt auf Observables)
  loading = signal(false);
  error = signal('');

  // 1) Eingabe als Observable-Quelle
  searchCtrl = new FormControl('', { nonNullable: true });

  // 2) In-Stock-Filter als BehaviorSubject (hat immer einen aktuellen Wert)
  inStockOnly$ = new BehaviorSubject<boolean>(false);

  // 3) Pipeline: Eingabe -> debounce -> distinct -> switchMap(HTTP)
  private rawResults$ = this.searchCtrl.valueChanges.pipe(
    startWith(this.searchCtrl.value),
    debounceTime(300),
    distinctUntilChanged(),
    tap(() => {
      this.loading.set(true);
      this.error.set('');
    }),
    switchMap((q) =>
      this.service.searchProducts(q).pipe(
        catchError((err) => {
          this.error.set('Fehler beim Laden. (Evtl. CORS/Netzwerk in Dev-Umgebung)');
          return of([] as Product[]);
        })
      )
    ),
    tap(() => this.loading.set(false)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // 4) combineLatest: Ergebnisse + Filter zusammenführen
  results$ = combineLatest([this.rawResults$, this.inStockOnly$]).pipe(
    map(([items, inStock]) => (inStock ? items.filter((i) => i.stock > 0) : items)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // 5) ViewModel für Template (ein Stream, eine async-Subscription)
  vm$ = this.results$.pipe(map((items) => ({ items })));

  toggleInStock(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.inStockOnly$.next(checked);
  }
}
