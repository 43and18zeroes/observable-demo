import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, tap } from 'rxjs';

export interface Product {
  id: number;
  title: string;
  price: number;
  stock: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductServiceTs {
  private http = inject(HttpClient);
  private cache = new Map<string, Product[]>();

  searchProducts(query: string): Observable<Product[]> {
    const q = (query ?? '').trim().toLowerCase();

    // Mini-Cache: wiederholte Eingaben werden aus dem Speicher geliefert
    if (this.cache.has(q)) {
      return of(this.cache.get(q)!).pipe(delay(150)); // kleine Verzögerung simuliert Netzwerk
    }

    const url = `https://dummyjson.com/products/search?q=${encodeURIComponent(q)}`;
    return this.http.get<{ products: any[] }>(url).pipe(
      map((r) =>
        (r.products ?? []).map(
          (p) =>
            ({
              id: p.id,
              title: p.title,
              price: p.price,
              stock: p.stock,
            } as Product)
        )
      ),
      tap((list) => this.cache.set(q, list))
    );
  }
}
