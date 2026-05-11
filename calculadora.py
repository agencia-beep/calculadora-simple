def sumar(a, b):
    return a + b

def restar(a, b):
    return a - b

def multiplicar(a, b):
    return a * b

def dividir(a, b):
    if b == 0:
        raise ValueError("No se puede dividir entre cero")
    return a / b

if __name__ == "__main__":
    print("Calculadora Simple")
    print("------------------")
    a = float(input("Primer numero: "))
    b = float(input("Segundo numero: "))
    op = input("Operacion (+, -, *, /): ")

    if op == "+":
        print(f"Resultado: {sumar(a, b)}")
    elif op == "-":
        print(f"Resultado: {restar(a, b)}")
    elif op == "*":
        print(f"Resultado: {multiplicar(a, b)}")
    elif op == "/":
        print(f"Resultado: {dividir(a, b)}")
    else:
        print("Operacion no valida")
